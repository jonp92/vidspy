// This script is for the slideshow functionality on the webpage
document.addEventListener("DOMContentLoaded", async function() {
    const autoPlay = document.getElementById("autoPlay");
    const videoStreamer = document.getElementById("videoStreamer");
    const playPauseIconPath = "/static/img/play.svg";
    const contextMenuTemplate = document.getElementById("contextMenu");
    const loadingSpinner = document.getElementById("spinner");
    const overlayCanvas = document.getElementById("overlay");
    const overlayContext = overlayCanvas.getContext("2d");
    let quality = "Medium";
    let isPaused = true;
    currentIndex = 0;
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
                    "Content-Type": "application/json"
                }
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
        const urlObj = stream.rtsp_urls.find(urlObj => urlObj.quality === quality);
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

        slideshowTimeout = setTimeout(() => startSlideshow(streams), 15000); // Change every 5 seconds
    }
    
    // Function to render the context menu from the template
    function renderContextMenu() {
        if (!contextMenuInstance) {
            const templateContent = contextMenuTemplate.content.cloneNode(true); // Clone the template content
            for (const listItem of templateContent.querySelectorAll("li")) {
                listItem.addEventListener("click", function(event) {
                    event.preventDefault();
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

    
    videoStreamer.addEventListener("click", function(event) {
        const eventX = event.clientX;
        const eventY = event.clientY;
        const videoWidth = videoStreamer.clientWidth;
        const videoHeight = videoStreamer.clientHeight;
        const clickX = (eventX / videoWidth) * 100;
        const clickY = (eventY / videoHeight) * 100;
        console.log(`Click coordinates: X: ${clickX}%, Y: ${clickY}%`);
        overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        overlayContext.fillStyle = "rgba(255, 0, 0, 0.5)";
        overlayContext.fillRect(eventX - 10, eventY - 10, 20, 20); // Draw a small square at the click position
        overlayContext.font = "16px Arial";
        overlayContext.fillStyle = "white";
        overlayContext.fillText(`X: ${clickX.toFixed(2)}%, Y: ${clickY.toFixed(2)}%`, eventX + 15, eventY - 15);
        overlayContext.strokeStyle = "red";
        overlayContext.strokeRect(eventX - 10, eventY - 10, 20, 20); // Draw a border around the square
        overlayCanvas.style.display = "flex"; // Show the overlay canvas
        setTimeout(() => {
            overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); // Clear the overlay canvas
            overlayCanvas.style.display = "none"; // Hide the overlay canvas
        }, 2000); // Hide after 2 seconds
        isPaused = !isPaused;
        if (!isPaused) spinner();
        startSlideshow(streams);
    });

    videoStreamer.addEventListener("error", function() {
        alert("Error loading video. Please check the URL or try a different video.");
    });

    window.addEventListener("beforeunload", function() {
        stopStream();
    });

    // Custom right-click menu
    videoStreamer.addEventListener("contextmenu", function (event) {
        const currentTime = new Date().getTime();
        // Ignore the custom context menu if the last context click was less than 500ms ago, open the default browser menu
        if (currentTime - lastContextClickTime < 500) {
            if (contextMenuInstance) {
                contextMenuInstance.style.display = "none"; // Hide the context menu
            }
            return; // Ignore the click if it's too close to the last one
        } else {
            lastContextClickTime = currentTime; // Update the last context click time
        }
        event.preventDefault();
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
    });

    document.addEventListener("click", function(event) {
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
});