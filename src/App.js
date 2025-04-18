import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front camera, 'environment' for back camera
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
        setPredictions([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        stopCamera();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode 
        } 
      });

      // Add check for videoRef.current
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      } else {
        // If video element isn't ready, stop the stream
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  useEffect(() => {
    if (useCamera && !selectedImage && videoRef.current) {
      startCamera();
    }
  }, [useCamera, selectedImage]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setSelectedImage(imageDataUrl);
      setPredictions([]);
      // Don't stop camera or set useCamera to false
    }
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    try {
      if (streamRef.current) {
        stopCamera();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: newFacingMode 
        } 
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (error) {
      console.error("Error switching camera:", error);
    }
  };

  const toggleInput = (useCamera) => {
    setUseCamera(useCamera);
    setSelectedImage(null);
    setPredictions([]);
    if (useCamera) {
      startCamera();
    } else {
      stopCamera();
    }
  };

  const classifyImage = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    try {
      // Convert base64 to blob
      const response = await fetch(selectedImage);
      const blob = await response.blob();

      // Send to Hugging Face API
      const result = await fetch(
        "https://router.huggingface.co/hf-inference/models/google/mobilenet_v2_1.0_224",
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_HUGGINGFACE_API_KEY}`,
            "Content-Type": "image/jpeg"
          },
          method: "POST",
          body: blob,
        }
      );
      
      const predictions = await result.json();
      setPredictions(predictions);
    } catch (error) {
      console.error("Error classifying image:", error);
    }
    setIsLoading(false);
  };

  return (
    <div className="App">
      <div className="container">
        <div className="input-toggle">
          <button 
            className={`toggle-btn ${!useCamera ? 'active' : ''}`}
            onClick={() => toggleInput(false)}
          >
            Upload
          </button>
          <button 
            className={`toggle-btn ${useCamera ? 'active' : ''}`}
            onClick={() => toggleInput(true)}
          >
            Camera
          </button>
        </div>

        <div className="upload-section">
          {!useCamera ? (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button 
                className="upload-btn"
                onClick={() => fileInputRef.current.click()}
              >
                Select an Image
              </button>
            </>
          ) : (
            <div className="camera-container">
              {!selectedImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{ maxWidth: '100%', display: 'block' }}
                  >
                    <track kind="captions" />
                  </video>
                  <div className="camera-controls">
                    <button 
                      className="switch-camera-btn"
                      onClick={switchCamera}
                      aria-label="Switch Camera"
                    >
                      <img src={require("./camera.png")} alt="Switch camera" />
                    </button>
                  </div>
                  <button 
                    className="capture-btn"
                    onClick={capturePhoto}
                  >
                    Take Photo
                  </button>
                </>
              ) : (
                <>
                  <div className="image-preview">
                    <img src={selectedImage} alt="Preview" />
                  </div>
                  <div className="camera-controls">
                    <button 
                      className="retake-btn"
                      onClick={() => {
                        setSelectedImage(null);
                        setPredictions([]);
                        // Add a small delay before starting the camera
                        setTimeout(() => {
                          startCamera();
                        }, 100);
                      }}
                    >
                      Retake Photo
                    </button>
                  </div>
                  <button 
                    className="classify-btn"
                    onClick={classifyImage}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Classifying...' : 'Classify Image'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="content-section">
          {!useCamera && selectedImage && (
            <>
              <div className="image-preview">
                <img src={selectedImage} alt="Preview" />
              </div>
              <button 
                className="classify-btn"
                onClick={classifyImage}
                disabled={isLoading}
              >
                {isLoading ? 'Classifying...' : 'Classify Image'}
              </button>
            </>
          )}

          {predictions.length > 0 && (
            <div className="predictions-section">
              <div className="top-prediction">
                <h3>{predictions[0].label}</h3>
                <h4>{(predictions[0].score * 100).toFixed(1)}%</h4>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
