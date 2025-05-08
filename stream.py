import threading
import time
import cv2

class VideoStream:
    def __init__(self, src=0, width=640, height=480, fps=30, logger=None):
        self.src = src
        self.width = width
        self.height = height
        self.fps = fps
        self.frame = None
        self.stopped = False
        self.lock = threading.Lock()
        self.thread = None
        self.streams = {}
        self.logger = logger
        if not self.logger:
            import logging
            self.logger = logging.getLogger("VidSpyLogger")
            self.logger.setLevel(logging.INFO)
            # Create a console handler
            ch = logging.StreamHandler()
            ch.setLevel(logging.INFO)
            ch.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
            # Add the handler to the logger
            self.logger.addHandler(ch)
        self.logger.info(f"VideoStream initialized with src={src}, width={width}, height={height}, fps={fps}")
    
    def generate_jpeg(self):
        """Generate MJPEG frames from the video stream."""
        while not self.stopped:
            frame = self.read()
            if frame is None:
                continue

            success, buffer = cv2.imencode('.jpg', frame)
            if not success:
                self.logger.error("Failed to encode frame.")
                continue

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        self.logger.debug(f"Video feed requested with src={self.src}, width={self.width}, height={self.height}, fps={self.fps}")
        
    def start(self):
        """Start the video stream in a separate thread."""
        self.stopped = False
        self.thread = threading.Thread(target=self.update, args=())
        self.thread.daemon = True
        self.thread.start()
        return self

    def update(self):
        """Continuously capture frames from the video source."""
        cap = cv2.VideoCapture(self.src)
        if not cap.isOpened():
            raise RuntimeError(f"Could not open video source {self.src}")

        try:
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            cap.set(cv2.CAP_PROP_FPS, self.fps)

            while not self.stopped:
                ret, frame = cap.read()
                if not ret:
                    print(f"Failed to read frame from source {self.src}")
                    continue

                # Resize the frame if needed
                # frame = cv2.resize(frame, (1280, 720))

                # Store the frame with a lock
                with self.lock:
                    self.frame = frame

                time.sleep(1 / self.fps)
        finally:
            cap.release()

    def read(self):
        """Retrieve the most recent frame."""
        with self.lock:
            return self.frame

    def stop(self):
        """Stop the video stream."""
        self.stopped = True
        if self.thread is not None:
            self.thread.join()