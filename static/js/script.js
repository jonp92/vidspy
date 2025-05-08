document.addEventListener("DOMContentLoaded", function() {
    const videoSelect = document.getElementById("videoSelect");
    const videoStreamer = document.getElementById("videoStreamer");
    const videoInfo = document.getElementById("videoInfo");

    videoSelect.addEventListener("change", function() {
        const selectedVideo = videoSelect;
        const selectedOption = selectedVideo.options[selectedVideo.selectedIndex];
        const quality = selectedOption.getAttribute("data-quality");
        const width = selectedOption.getAttribute("data-width");
        const height = selectedOption.getAttribute("data-height");
        const fps = selectedOption.getAttribute("data-fps");
        // if (quality ==="High") {
        //     console.log("High quality selected");
        //     videoStreamer.style.width = `1920px`;
        //     videoStreamer.style.height = `1080px`;
        // } else {
        //     videoStreamer.style.width = `1280px`;
        //     videoStreamer.style.height = `720px`;
        // }
        const videoInfoText = `Width: ${width}, Height: ${height}, FPS: ${fps}, URL: ${selectedVideo.value}`;
        videoInfo.textContent = videoInfoText;
        console.log(selectedOption.getAttribute("data-width"), selectedOption.getAttribute("data-height"), selectedOption.getAttribute("data-fps"));
        if (selectedVideo) {
            fetch("/stop", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then(response => {
                if (response.ok) {
                    console.log("Video stopped successfully.");
                }
                else {
                    console.error("Error stopping video.");
                }
            })
            .catch(error => {
                console.error("Error stopping video:", error);
            });   
            setTimeout(() => {
                videoStreamer.src = `/video_feed?src=${selectedVideo.value}&width=${width}&height=${height}&fps=${fps}`;
            }, 300);
        }
    });
    videoStreamer.addEventListener("error", function() {
        alert("Error loading video. Please check the URL or try a different video.");
    });

    window.addEventListener("beforeunload", function() {
        fetch("/stop", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        })
        .then(response => {
            if (response.ok) {
                console.log("Video stopped successfully.");
            }
            else {
                console.error("Error stopping video.");
            }
        })
        .catch(error => {
            console.error("Error stopping video:", error);
        });
    });
});