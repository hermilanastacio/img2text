import React, { useState, useRef } from 'react';
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
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

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
      stopCamera();
      setUseCamera(false);
    }
  };

  const switchCamera = async () => {
    setFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
    await startCamera();
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
        <h1>WebClassify</h1>
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
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ maxWidth: '100%', display: selectedImage ? 'none' : 'block' }}
              />
              <div className="camera-controls">
                <button 
                  className="switch-camera-btn"
                  onClick={switchCamera}
                >
                  Switch Camera
                </button>
                <button 
                  className="capture-btn"
                  onClick={capturePhoto}
                >
                  Take Photo
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="content-section">
          {selectedImage && (
            <div className="image-preview">
              <img src={selectedImage} alt="Selected" />
              <button 
                className="classify-btn"
                onClick={classifyImage}
                disabled={isLoading}
              >
                {isLoading ? 'Classifying...' : 'Classify Image'}
              </button>
            </div>
          )}

          {predictions.length > 0 && (
            <div className="predictions-section">
              <h2>Predictions</h2>
              <div className="predictions-list">
                {predictions.map((prediction, index) => (
                  <div className="prediction-item" key={index}>
                    <span className="label">{prediction.label}</span>
                    <div className="confidence-bar">
                      <div 
                        className="confidence-fill"
                        style={{ width: `${(prediction.score * 100).toFixed(1)}%` }}
                      />
                    </div>
                    <span className="percentage">
                      {(prediction.score * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
