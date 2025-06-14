import React, { useEffect, useRef, useState } from "react";

const CameraCapture = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceBoxRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [photo_, setPhoto_] = useState(null);
  const [statecheck, setStateCheck] = useState(false);
  const [stream, setStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false); // New state to track capture status
  const [isSubmitting, setIsSubmitting] = useState(false); // State to prevent multiple submissions and show loading

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const faceBox = faceBoxRef.current;

    const displayWidth = video.offsetWidth;
    const displayHeight = video.offsetHeight;

    const boxWidth = faceBox.offsetWidth;
    const boxHeight = faceBox.offsetHeight;

    const boxX = (displayWidth - boxWidth) / 2;
    const boxY = (displayHeight - boxHeight) / 2;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const scaleX = videoWidth / displayWidth;
    const scaleY = videoHeight / displayHeight;

    const cropX = boxX * scaleX;
    const cropY = boxY * scaleY;
    const cropWidth = boxWidth * scaleX;
    const cropHeight = boxHeight * scaleY;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // canvas.width = boxWidth;
    // canvas.height = boxHeight;

    const ctx = canvas.getContext("2d");
    // const ctx_ = canvas.getContext("2d");
    console.log(cropX);
    console.log(cropWidth);
    console.log(boxWidth);

    ctx.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      displayWidth,
      displayHeight
    );

    // ctx_.drawImage(
    //   video,
    //   cropX,
    //   cropY,
    //   cropWidth,
    //   cropHeight,
    //   0,
    //   0,
    //   480,
    //   640);

    // ctx.drawImage(
    //   video,
    //   cropX ,
    //   cropY,
    //   cropWidth,
    //   cropHeight,
    //   0,
    //   0,
    //   boxWidth,
    //   boxHeight
    // );

    setPhoto(canvas.toDataURL("image/png"));
    // setPhoto_(canvas.toDataURL("image/png"));
    setIsCaptured(true); // Set captured state to true
    stopCamera();
  };

  const stopCamera = () => {
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  const handleShow = () => {
    setStateCheck(true);
    setIsCaptured(false); // Reset captured state when showing camera

    const startCamera = async () => {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play();
        }
        setStream(newStream);
        setIsCameraOn(true);
      } catch (error) {
        console.error("Failed to start camera:", error);
        alert("Could not access camera. Please check permissions.");
        setStateCheck(false);
      }
    };
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  };

  const handleHide = () => {
    setStateCheck(false);
    setIsCaptured(false); // Reset captured state
    setPhoto(null); // Clear the captured photo
    setPhoto_(null);
    setIsSubmitting(false); // Reset submitting state
    stopCamera();
  };

  const handleRetake = () => {
    setIsCaptured(false); // Reset to show camera and original buttons
    setPhoto(null); // Clear the captured photo
    // setPhoto_(null);
    setIsSubmitting(false); // Reset submitting state
    handleShow();
  };

  const handleSendToApi = async () => {
    if (!photo || isSubmitting) {
      console.log("No photo to send or submission in progress.");
      if (!photo) alert("No photo captured.");
      return;
    }

    setIsSubmitting(true); // Disable further submissions and show loading

    const resizeImage = (imageData, newWidth, newHeight) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = imageData;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = newWidth;
          canvas.height = newHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          resolve(canvas.toDataURL("image/png"));
        };
      });
    };

    const handleProceed = async () => {
      if (photo) {
        const resizedPhoto = await resizeImage(photo, 480, 640);
        console.log("Resized Photo:", resizedPhoto);
        proceed(resizedPhoto);
      }
    };

    const proceed = async (imageData) => {
      try {
        const response = await axios.post(
          "http://10.221.96.131:6059/save_file",
          { image: imageData }
        );
        console.log("API Response:", response.data);
      } catch (error) {
        console.error("Error sending image to API:", error);
      }
    };

    const filename = "captured_photo.png"; // Default filename

    try {
      // Convert base64 to blob
      const byteString = atob(photo.split(",")[1]);
      const mimeString = photo.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });

      // Create form data
      const formData = new FormData();
      formData.append("file", blob, "facecap.png");
      formData.append("filename", "facecap.png");
      formData.append("application_name", "facecapture");

      console.log("Sending FormData to API...");

      // Use fetch with error handling
      const response = await fetch("http://10.221.96.131:6059/save_file", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Image successfully sent to API:", result);
        alert("Photo successfully uploaded!");
      } else {
        throw new Error("API request failed");
      }
    } catch (error) {
      console.error("Error sending image to API:", error);
      // alert('Failed to upload photo. Please try again.');
    }
  };

  return (
    <>
      <div>
        <div className="container">
          {statecheck ? (
            <div>
              <div className="camera-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="camera-video"
                  style={{ display: isCaptured ? "none" : "block" }} // Hide video after capture
                />
                <div
                  ref={faceBoxRef}
                  className="face-box"
                  style={{ display: isCaptured ? "none" : "block" }} // Hide face box after capture
                ></div>
              </div>

              {!isCaptured && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "10px",
                  }}
                >
                  <button className="button2" onClick={capturePhoto}>
                    CAPTURE
                  </button>
                  <button className="button3" onClick={handleHide}>
                    CANCEL
                  </button>
                </div>
              )}

              {/* Show these buttons only when captured */}
              {isCaptured && (
                <>
                  {/* <canvas ref={canvasRef} style={{ display: "none" }} /> */}
                  {photo && (
                    <img
                      src={photo}
                      alt="Captured"
                      style={{
                        display: "block",
                        marginTop: "20px",
                        objectFit: "cover",
                        width: "100%",
                      }}
                    />
                  )}
                  {/* {isSubmitting && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          // background: "rgba(0, 0, 0, 0.5)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "24px",
                        }}
                      >
                        <div
                          style={{
                            border: "4px solid #f3f3f3",
                            borderTop: "4px solid #3498db",
                            borderRadius: "50%",
                            width: "40px",
                            height: "40px",
                            animation: "spin 1s linear infinite",
                          }}
                        ></div>
                      </div>
                    )} */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "10px",
                    }}
                  >
                    <button className="button4" onClick={handleRetake}>
                      RETAKE
                    </button>
                    <button className="button5" onClick={handleSendToApi}>
                      PROCEED
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
          {!statecheck ? (
            <div id="uploadStr">
              <button className="button1" onClick={handleShow}>
                UPLOAD PHOTO
              </button>
            </div>
          ) : null}

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      </div>
      {/* <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style> */}
    </>
  );
};

export default CameraCapture;