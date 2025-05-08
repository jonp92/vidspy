// This script is for the slideshow functionality on the webpage
document.addEventListener("DOMContentLoaded", async function() {
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
            const response = await fetch("/stop?src=all", {
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

    function findParentDiv(element) {
        while (element && element.tagName !== "DIV") {
            element = element.parentElement;
        }
        return element;
    }
    
    // Function to render the context menu from the template
    function renderContextMenu() {
        if (!contextMenuInstance) {
            const templateContent = contextMenuTemplate.content.cloneNode(true); // Clone the template content
            for (const listItem of templateContent.querySelectorAll("li")) {
                listItem.addEventListener("click", function(event) {
                    event.preventDefault();
                    if (document.getElementById("contextMenuInstance")) {
                        contextMenuInstance.style.display = "none"; // Hide the context menu
                    }
                    if (event.target.id === "settings") {
                        settingsMenu.classList.toggle("active");
                        return;
                    } else if (event.target.id === "stopStreams") {
                        const stopStreamAnswer = confirm("Are you sure you want to stop all streams? This affects every user viewing the stream.");
                        if (!stopStreamAnswer) {
                            console.log("User canceled the stop stream action.");
                            return;
                        }
                        stopStream();
                        if (slideshowTimeout) {
                            clearTimeout(slideshowTimeout); // Clear the timeout to prevent immediate restart
                        }
                        isPaused = true;
                        videoStreamer.src = playPauseIconPath;
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
        const arrowX = side === "left"
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

    videoStreamer.addEventListener("click", function(event) {
        const eventX = event.clientX;
        const eventY = event.clientY;
        const videoWidth = videoStreamer.clientWidth;
        const videoHeight = videoStreamer.clientHeight;
        const clickX = (eventX / videoWidth) * 100;
        const clickY = (eventY / videoHeight) * 100;
        console.log(`Click coordinates: X: ${clickX}%, Y: ${clickY}%`);

        // overlayContext.fillStyle = "rgba(255, 0, 0, 0.5)";
        // overlayContext.fillRect(eventX - 10, eventY - 10, 20, 20); // Draw a small square at the click position
        // overlayContext.strokeRect(eventX - 10, eventY - 10, 20, 20); // Draw a border around the square
        // setTimeout(() => {
        //     overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); // Clear the overlay canvas
        // }, 5000); // Hide after 2 seconds
        if (eventX < videoWidth / 8) {
            console.log("Left quarter clicked");
            overlayContext.fillStyle = "rgba(73, 73, 73, 0.65)";
            overlayContext.fillRect(0, 0, videoWidth / 8, videoHeight); // Fill the left quarter with a semi-transparent color
            drawArrow("left", true);
            currentIndex = (currentIndex - 2 + streams.length) % streams.length; // Go back to the previous stream
            if (slideshowTimeout) {
                clearTimeout(slideshowTimeout); // Clear the timeout to prevent immediate restart
            }
            setTimeout(() => {
                startSlideshow(streams);
            }, 300); // Delay before starting the slideshow again
            return;
        } else if (eventX > (videoWidth * 7) / 8) {
            console.log("Right quarter clicked");
            overlayContext.fillStyle = "rgba(73, 73, 73, 0.65)";
            overlayContext.fillRect(videoWidth * 7 / 8, 0, videoWidth / 8, videoHeight); // Fill the right quarter with a semi-transparent color
            drawArrow("right", true);
            // Fill the right quarter with a semi-transparent color
            
            if (slideshowTimeout) {
                clearTimeout(slideshowTimeout); // Clear the timeout to prevent immediate restart
            }
            setTimeout(() => {
                startSlideshow(streams);
            }, 300); // Delay before starting the slideshow again
            return;
        }
        isPaused = !isPaused;
        if (!isPaused) spinner();
        startSlideshow(streams);
    });

    // videoStreamer.addEventListener("mouseenter", function(event) {
    //     const eventX = event.clientX;
    //     const eventY = event.clientY;
    //     const videoWidth = videoStreamer.clientWidth;
    //     const videoHeight = videoStreamer.clientHeight;
    //     const clickX = (eventX / videoWidth) * 100;
    //     const clickY = (eventY / videoHeight) * 100;
    //     console.log(`Click coordinates: X: ${clickX}%, Y: ${clickY}%`);

    //     // overlayContext.fillStyle = "rgba(255, 0, 0, 0.5)";
    //     // overlayContext.fillRect(eventX - 10, eventY - 10, 20, 20); // Draw a small square at the click position
    //     // overlayContext.strokeRect(eventX - 10, eventY - 10, 20, 20); // Draw a border around the square
    //     // setTimeout(() => {
    //     //     overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); // Clear the overlay canvas
    //     // }, 5000); // Hide after 2 seconds
    //     if (eventX < videoWidth / 8) {
    //         console.log("Left quarter clicked");
    //         overlayContext.fillStyle = "rgba(73, 73, 73, 0.65)";
    //         overlayContext.fillRect(0, 0, videoWidth / 8, videoHeight); // Fill the left quarter with a semi-transparent color
    //         drawArrow("left", true);
    //         return;
    //     } else if (eventX > (videoWidth * 7) / 8) {
    //         console.log("Right quarter clicked");
    //         overlayContext.fillStyle = "rgba(73, 73, 73, 0.65)";
    //         overlayContext.fillRect(videoWidth * 7 / 8, 0, videoWidth / 8, videoHeight); // Fill the right quarter with a semi-transparent color
    //         drawArrow("right", true);
    //         return;
    //     }
    // });

    // videoStreamer.addEventListener("mouseleave", function(event) {
    //     const eventX = event.clientX;
    //     const eventY = event.clientY;
    //     const videoWidth = videoStreamer.clientWidth;
    //     const videoHeight = videoStreamer.clientHeight;
    //     const clickX = (eventX / videoWidth) * 100;
    //     const clickY = (eventY / videoHeight) * 100;
    //     console.log(`Click coordinates: X: ${clickX}%, Y: ${clickY}%`);

    //     overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); // Clear the overlay canvas
    // });

    videoStreamer.addEventListener("error", function() {
        alert("Error loading video. Please check the URL or try a different video.");
    });

    // window.addEventListener("beforeunload", function() {
    //     stopStream();
    // });

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

    settingsQuality.addEventListener("change", function() {
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

    closeSettingsMenuBtn.addEventListener("click", function() {
        settingsMenu.classList.remove("active");
        console.log("Settings menu closed");
    });

});