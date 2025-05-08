import time
import os
import json
from flask import Flask, Response, request, jsonify, render_template
from stream import VideoStream, cv2, threading

class VidSpyServer:
    def __init__(self, host='127.0.1', port=5000, logger=None):
        self.app = Flask(__name__)
        self.host = host
        self.port = port
        self.video_stream = None
        self.logger = logger or self.app.logger
        self.streams = {}
        self.thread_lock = threading.Lock()
        self.define_routes()
        threading.Thread(target=self.cleanup_streams, daemon=True).start()
        
    def get_or_create_stream(self, src, width, height, fps):
        """Get an existing stream or create a new one."""
        key = (src, width, height, fps)
        if key not in self.streams or self.streams[key].stopped:
            try:
                self.logger.info(f"Creating new stream for src={src}, width={width}, height={height}, fps={fps}")
                self.streams[key] = VideoStream(src=src, width=width, height=height, fps=fps)
                self.streams[key].start()
            except RuntimeError as e:
                self.logger.error(f"Failed to create stream for {key}: {e}")
                return None
        return self.streams[key]
    
    def cleanup_streams(self):
        """Stop all video streams."""
        while True:
            with self.thread_lock:
                for key, stream in list(self.streams.items()):
                    if stream.stopped:
                        self.logger.info(f"Stopping stream for {key}")
                        stream.stop()
                        del self.streams[key]
            time.sleep(60)  # Check every 5 seconds
            self.logger.info("Cleaning up stopped streams.")    
            
    def define_routes(self):
        @self.app.route('/video_feed', methods=['POST', 'GET'])
        def video_feed():
            src = request.args.get('src', default='0', type=str)
            width = request.args.get('width', default=640, type=int)
            height = request.args.get('height', default=480, type=int)
            fps = request.args.get('fps', default=30, type=int)
            self.logger.info(f"Video feed requested with src={src}, width={width}, height={height}, fps={fps}")
            video_stream = self.get_or_create_stream(src, width, height, fps)
            if video_stream is None:
                return jsonify({"error": "Failed to create video stream."}), 500
            return Response(video_stream.generate_jpeg(),
                            mimetype='multipart/x-mixed-replace; boundary=frame')
            
        @self.app.route('/')
        def index():
            streams_json = []
            with open('static/streams.json', 'r') as f:
                streams_json = json.load(f)
            return render_template('stream.html', streams=streams_json)
        
        @self.app.route('/slideshow', methods=['GET'])
        def slideshow():
            auto_play = request.args.get('autoplay', default='false', type=str)
            return render_template('slideshow.html', auto_play=auto_play)
        
        @self.app.route('/stop', methods=['POST'])
        def stop():
            # Logic to stop the video stream
            if self.video_stream is not None:
                self.video_stream.stop()
                self.logger.info("Video stream stopped.")
                self.video_stream = None
            return jsonify({"message": "Video stream stopped."})
            
        @self.app.route('/streams', methods=['GET'])
        def streams():
            # Logic to get the list of available streams
            streams_json = []
            with open('static/streams.json', 'r') as f:
                streams_json = json.load(f)
            return jsonify(streams_json)
        
        @self.app.route('/health', methods=['GET'])
        def health():
            active_streams = [{"src": key[0], "width": key[1], "height": key[2], "fps": key[3]} for key in self.streams.keys()]
            return jsonify({"status": "running", "active_streams": active_streams})
        
app = VidSpyServer().app
