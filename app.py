import signal
import sys
import logging
from logging.handlers import RotatingFileHandler
from server import VidSpyServer

def setup_logger():
    """Set up a unified logger for the application."""
    logger = logging.getLogger("VidSpyLogger")
    logger.setLevel(logging.INFO)

    # Create a rotating file handler
    log_handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=1)
    log_handler.setLevel(logging.INFO)
    log_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))

    # Add the handler to the logger
    logger.addHandler(log_handler)
    return logger

# Set up the unified logger
logger = setup_logger()

# Initialize the VidSpyServer with the unified logger
server = VidSpyServer(logger=logger)

def cleanup(signal, frame):
    """Handle cleanup on exit."""
    with server.thread_lock:
        for key, data in server.streams.items():
            stream = data["stream"]
            logger.info(f"Stopping stream for src={key[0]}, width={key[1]}, height={key[2]}, fps={key[3]}")
            stream.stop()
            del server.streams[key]

# Register signal handlers for graceful shutdown
signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

if __name__ == '__main__':
    # Start the Flask server
    logger.info(f"VidSpy server started on http://{server.host}:{server.port}")
    logger.info("Press Ctrl+C to stop the server.")
    server.app.run(host='0.0.0.0', port=5001, debug=True)