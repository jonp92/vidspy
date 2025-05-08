document.addEventListener("DOMContentLoaded", async function () {
    const autoPlay = document.getElementById("autoPlay");
    const videoStreamer = document.getElementById("videoStreamer");
    const playPauseIconPath = "/static/img/play.svg";
    const contextMenuTemplate = document.getElementById("contextMenu");
    const loadingSpinner = document.getElementById("spinner");
    const overlayCanvas = document.getElementById("overlay");
    const overlayContext = overlayCanvas.getContext("2d");
    const settingsMenu = document.getElementById("settingsMenu");
    const closeSettingsMenuBtn = document.getElementById("closeSettings");
    const settingsQuality = document.getElementById("quality");
    let longPressTimer;
    let isLongPress = false;
    let quality = "Medium";
    let isPaused = true;
    let currentIndex = 0;
    let slideshowTimeout;
    let contextMenuInstance;
    let lastContextClickTime = 0;

    async function fetchStreams() {
        try {
            const response = await fetch("/streams");
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching streams:", error);
        }
    }

    async function stopStream() {
        try {
            const response = await fetch("/stop", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
        } catch (error) {
            console.error("Error stopping stream:", error);
        }
    }

    async function startSlideshow(streams) {
        if (isPaused) {
            clearTimeout(slideshowTimeout);
            videoStreamer.src = playPauseIconPath;
            stopStream();
            return;
        }
        if (currentIndex >= streams.length) {
            currentIndex = 0; // Reset to the first stream
        }
        const stream = streams[currentIndex];
        const urlObj = stream.rtsp_urls.find((urlObj) => urlObj.quality === quality);
        if (!urlObj) {
            console.error(`No URL found for quality: ${quality}`);
            return;
        }
        const rtsp_url = urlObj.url;
        const width = urlObj.width;
        const height = urlObj.height;
        const fps = urlObj.fps;
        videoStreamer.src = `/video_feed?src=${rtsp_url}&width=${width}&height=${height}&fps=${fps}`;
        currentIndex++;
        if (loadingSpinner.style.display !== "none") {
            loadingSpinner.style.display = "none"; // Hide the spinner
        }

        slideshowTimeout = setTimeout(() => startSlideshow(streams), 15000); // Change every 15 seconds
    }

    function renderContextMenu() {
        if (!contextMenuInstance) {
            const templateContent = contextMenuTemplate.content.cloneNode(true); // Clone the template content
            for (const listItem of templateContent.querySelectorAll("li")) {
                listItem.addEventListener("click", function (event) {
                    event.preventDefault();
                    if (document.getElementById("contextMenuInstance")) {
                        contextMenuInstance.style.display = "none"; // Hide the context menu
                    }
                    if (event.target.textContent === "Settings") {
                        settingsMenu.classList.toggle("active");
                        return;
                    }
                    alert(`You clicked on ${listItem.textContent}`);
                });
            }
            contextMenuInstance = document.createElement("div");
            contextMenuInstance.id = "contextMenuInstance";
            contextMenuInstance.style.position = "absolute";
            contextMenuInstance.style.display = "none";
            contextMenuInstance.appendChild(templateContent);
            document.body.appendChild(contextMenuInstance); // Append to the body
        }
        return contextMenuInstance;
    }

    const streams = await fetchStreams();

    function drawArrow(side, timeout = false) {
        const arrowWidth = 40;
        const arrowHeight = 30;

        // Calculate the X position to center the arrow in the respective eighth
        const arrowX =
            side === "left"
                ? videoStreamer.clientWidth / 16 - arrowWidth / 2 // Center in the left eighth
                : videoStreamer.clientWidth * 15 / 16 - arrowWidth / 2; // Center in the right eighth

        const arrowY = (videoStreamer.clientHeight - arrowHeight) / 2; // Vertically center the arrow

        overlayContext.fillStyle = "rgba(255, 255, 255, 0.82)";
        overlayContext.beginPath();

        if (side === "left") {
            // Arrow pointing to the left
            overlayContext.moveTo(arrowX + arrowWidth, arrowY);
            overlayContext.lineTo(arrowX, arrowY + arrowHeight / 2);
            overlayContext.lineTo(arrowX + arrowWidth, arrowY + arrowHeight);
        } else if (side === "right") {
            // Arrow pointing to the right
            overlayContext.moveTo(arrowX, arrowY);
            overlayContext.lineTo(arrowX + arrowWidth, arrowY + arrowHeight / 2);
            overlayContext.lineTo(arrowX, arrowY + arrowHeight);
        }

        overlayContext.closePath();
        overlayContext.fill();

        if (timeout) {
            setTimeout(() => {
                overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); // Clear the overlay canvas
            }, 3000); // Hide after 3 seconds
        }
    }

    videoStreamer.addEventListener("pointerdown", function (event) {
        isLongPress = false; // Reset the long press flag
        longPressTimer = setTimeout(() => {
            isLongPress = true; // Set the long press flag
            const contextMenu = renderContextMenu();

            // Get the dimensions of the context menu
            const menuWidth = contextMenu.offsetWidth;
            const menuHeight = contextMenu.offsetHeight;

            // Get the dimensions of the viewport
            const viewportWidth = document.documentElement.clientWidth;
            const viewportHeight = document.documentElement.clientHeight;

            // Calculate the initial position of the context menu
            let left = event.clientX;
            let top = event.clientY;

            // Adjust the position if the menu would overflow the viewport
            if (left + menuWidth > viewportWidth) {
                left = viewportWidth - menuWidth; // Move the menu to the left
            }
            if (left < 0) {
                left = 0; // Ensure the menu doesn't go off the left edge
            }
            if (top + menuHeight > viewportHeight) {
                top = viewportHeight - menuHeight; // Move the menu up
            }
            if (top < 0) {
                top = 0; // Ensure the menu doesn't go off the top edge
            }

            // Set the position and display the menu
            contextMenu.style.display = "block";
            contextMenu.style.left = `${left}px`;
            contextMenu.style.top = `${top}px`;
        }, 500); // Trigger after 500ms
    });

    videoStreamer.addEventListener("pointerup", function (event) {
        clearTimeout(longPressTimer); // Clear the timer if the pointer is released

        if (!isLongPress) {
            // Handle regular click
            const eventX = event.clientX;
            const videoWidth = videoStreamer.clientWidth;

            if (eventX < videoWidth / 8) {
                console.log("Left eighth clicked");
                drawArrow("left", true);
                currentIndex = (currentIndex - 1 + streams.length) % streams.length; // Go back to the previous stream
                startSlideshow(streams);
            } else if (eventX > (videoWidth * 7) / 8) {
                console.log("Right eighth clicked");
                drawArrow("right", true);
                currentIndex = (currentIndex + 1) % streams.length; // Go to the next stream
                startSlideshow(streams);
            } else {
                isPaused = !isPaused;
                if (!isPaused) spinner();
                startSlideshow(streams);
            }
        }
    });

    videoStreamer.addEventListener("pointermove", function () {
        clearTimeout(longPressTimer); // Cancel the long press if the pointer moves
    });

    document.addEventListener("click", function (event) {
        if (contextMenuInstance && !contextMenuInstance.contains(event.target)) {
            contextMenuInstance.style.display = "none"; // Hide the context menu
        }
    });

    if (autoPlay.value === "true") {
        isPaused = false;
        console.log("Auto start is enabled, starting slideshow...");
        startSlideshow(streams);
    }

    function spinner() {
        const spinner = document.getElementById("spinner");
        if (spinner && spinner.style.display === "none") {
            spinner.style.display = "block"; // Show the spinner
        } else if (spinner) {
            spinner.style.display = "none"; // Hide the spinner
        }
    }

    function adjustCanvasForHiDPI(canvas, context) {
        const dpr = window.devicePixelRatio || 1; // Get the device pixel ratio
        const rect = canvas.getBoundingClientRect(); // Get the canvas's CSS size

        // Set the canvas width and height to match the device pixel ratio
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        // Scale the drawing context to match the device pixel ratio
        context.scale(dpr, dpr);
    }

    // Adjust the overlay canvas for HiDPI
    adjustCanvasForHiDPI(overlayCanvas, overlayContext);

    settingsQuality.addEventListener("change", function () {
        quality = settingsQuality.value;
        console.log("Selected quality:", quality);
        if (isPaused) {
            clearTimeout(slideshowTimeout);
            videoStreamer.src = playPauseIconPath;
            stopStream();
            return;
        }
        startSlideshow(streams);
    });

    closeSettingsMenuBtn.addEventListener("click", function () {
        settingsMenu.classList.remove("active");
        console.log("Settings menu closed");
    });
});