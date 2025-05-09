import time
import os
import json
from datetime import datetime
from flask import Flask, Response, request, jsonify, render_template
from flask_compress import Compress
from flask_minify import Minify
from stream import VideoStream, cv2, threading

class VidSpyServer:
    def __init__(self, host='127.0.1', port=5000, logger=None, cleanup_interval=120):
        self.app = Flask(__name__)
        Minify(app=self.app, html=True, js=True, cssless=True)
        Compress(self.app)
        self.host = host
        self.port = port
        self.cleanup_interval = cleanup_interval
        self.video_stream = None
        self.logger = logger or self.app.logger
        self.streams = {}
        self.thread_lock = threading.Lock()
        self.define_routes()
        threading.Thread(target=self.cleanup_streams, daemon=True).start()
        
    
    def get_or_create_stream(self, src, width, height, fps):
        """Get an existing stream or create a new one."""
        key = (src, width, height, fps)
        current_time = datetime.now()
        if key not in self.streams or self.streams[key]["stream"].stopped:
            try:
                self.logger.info(f"Creating new stream for src={src}, width={width}, height={height}, fps={fps}")
                self.streams[key] = {
                    "stream": VideoStream(src=src, width=width, height=height, fps=fps),
                    "last_accessed": current_time
                }
                self.streams[key]["stream"].start()
            except RuntimeError as e:
                self.logger.error(f"Failed to create stream for {key}: {e}")
                return None
        else:
            # Update the last accessed time for an existing stream
            self.streams[key]["last_accessed"] = current_time
        return self.streams[key]["stream"]
    
    def cleanup_streams(self):
        """Stop and remove streams that have not been accessed recently."""
        while True:
            with self.thread_lock:
                current_time = datetime.now()
                for key, data in list(self.streams.items()):
                    stream = data["stream"]
                    last_accessed = data["last_accessed"]
                    # Remove streams that have been stopped or inactive for more than 5 minutes
                    if stream.stopped or (current_time - last_accessed).total_seconds() > self.cleanup_interval:
                        self.logger.debug(f"Stopping and removing stream for {key} (last accessed: {last_accessed})")
                        stream.stop()
                        del self.streams[key]
            time.sleep(60)  # Check every 60 seconds
            self.logger.info("Cleaning up inactive streams.")    
            
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
            src = request.args.get('src', default='0', type=str)
            if not src:
                return jsonify({"error": "No source provided."}), 400
            with self.thread_lock:
                if src == 'all':
                    for key, data in list(self.streams.items()):
                        stream = data["stream"]
                        self.logger.info(f"Stopping stream for src={key[0]}, width={key[1]}, height={key[2]}, fps={key[3]}")
                        stream.stop()
                        del self.streams[key]
                else:
                    for key, data in list(self.streams.items()):
                        if key[0] == src:
                            stream = data["stream"]
                            self.logger.info(f"Stopping stream for src={key[0]}, width={key[1]}, height={key[2]}, fps={key[3]}")
                            stream.stop()
                            del self.streams[key]
            return jsonify({"status": "success", "message": f"Stream for src={src} stopped."})
            
        @self.app.route('/streams', methods=['GET'])
        def streams():
            # Logic to get the list of available streams
            streams_json = []
            with open('static/streams.json', 'r') as f:
                streams_json = json.load(f)
            return jsonify(streams_json)
        
        @self.app.route('/health', methods=['GET'])
        def health():
            active_streams = [
                {
                    "src": key[0],
                    "width": key[1],
                    "height": key[2],
                    "fps": key[3],
                    "last_accessed": data["last_accessed"].isoformat()
                }
                for key, data in self.streams.items()
            ]
            return jsonify({"status": "running", "active_streams": active_streams})
        
app = VidSpyServer().app
