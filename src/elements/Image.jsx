import React from "react";
import { MdAddPhotoAlternate } from "react-icons/md";
import { BiCollapseAlt } from "react-icons/bi";
import { FaTrashCan } from "react-icons/fa6";
import { IoCamera } from "react-icons/io5";
import { FaUpload } from "react-icons/fa";

class Image extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            imageData: props.element.image_data || null, // Base64-encoded image data
            imageName: props.element.title || `Image - ${new Date().toLocaleDateString()}`,
            deleteMenuOpen: false,
            stream: null, // For camera stream
            showCamera: false, // To toggle camera view
        };
        this.videoRef = React.createRef();
        this.canvasRef = React.createRef();
        this.fileInputRef = React.createRef();
        // Bind the handleFileUpload method
        this.handleFileUpload = this.handleFileUpload.bind(this);
    }

    componentDidMount() {
        if (this.state.showCamera) {
            this.openCamera();
        }
    }

    componentWillUnmount() {
        // Stop the camera stream when the component unmounts
        if (this.state.stream) {
            this.state.stream.getTracks().forEach((track) => track.stop());
        }
    }

    handleDoubleClick = () => {
        this.props.onDoubleClick(this.props.element);
    };

    // Open the camera
    openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.setState({ stream, showCamera: true }, () => {
                if (this.videoRef.current) {
                    this.videoRef.current.srcObject = stream;
                    this.videoRef.current.play();
                }
            });
        } catch (error) {
            console.error("Error accessing camera:", error);
            alert("Failed to access camera. Please ensure you have granted permission.");
        }
    };

    // Capture a photo from the camera
    capturePhoto = () => {
        const video = this.videoRef.current;
        const canvas = this.canvasRef.current;
        if (video && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL("image/png");
            this.setState({ imageData, showCamera: false }, () => {
                // Stop the camera stream
                if (this.state.stream) {
                    this.state.stream.getTracks().forEach((track) => track.stop());
                }
            });
        }
    };

    // Handle file upload from PC
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.setState({
                    imageData: e.target.result,
                    imageName: file.name,
                });
            };
            reader.readAsDataURL(file);
        }
    }

    // Render the closed view (placeholder or image)
    renderClosed() {
        const { element } = this.props;
        return (
            <div
                className="image-box"
                style={{ left: element.x, top: element.y }}
                draggable
                onDragStart={this.props.onDragStart}
                onDragEnd={this.props.onDragEnd}
                onDoubleClick={this.handleDoubleClick}
            >
                {element.image_data ? (
                    <div className="image-container">
                        <img src={element.image_data} alt={element.title} className="image-preview" />
                        <div className="image-title">{element.title}</div>
                    </div>
                ) : (
                    <div className="placeholder-icon"><MdAddPhotoAlternate /></div>
                )}
            </div>
        );
    }

    // Render the expanded view (for uploading or capturing an image)
    renderOpened() {
        const { element, onClose } = this.props;
        const { imageData, imageName, deleteMenuOpen, showCamera } = this.state;

        return (
            <div className="image-overlay">
                <div className="expanded-image">
                    {showCamera ? (
                        <div className="camera-view">
                            <video ref={this.videoRef} className="camera-feed" />
                            <button onClick={this.capturePhoto} className="capture-button">
                                Capture
                            </button>
                            <canvas ref={this.canvasRef} style={{ display: "none" }} />
                        </div>
                    ) : imageData ? (
                        <>
                            <div className="image-title-expanded">{imageName}</div>
                            <img src={imageData} alt={imageName} className="image-expanded" />
                        </>
                    ) : (
                        <>
                            <div className="add-image">Add Image</div>
                            <div className="image-options">
                                <div onClick={this.openCamera} className="image-option-button">
                                    <IoCamera className="option-icon" />
                                    <div className="option-text">Open Camera</div>
                                </div>
                                <div
                                    onClick={() => this.fileInputRef.current.click()}
                                    className="image-option-button"
                                >
                                    <FaUpload className="option-icon" />
                                    <div className="option-text">Upload from device</div>
                                </div>
                                <input
                                    type="file"
                                    ref={this.fileInputRef}
                                    accept="image/*"
                                    onChange={this.handleFileUpload}
                                    style={{ display: "none" }}
                                />
                            </div>
                        </>
                    )}

                    <div className="actions">
                        <BiCollapseAlt
                            className="close-icon"
                            onClick={async () => {
                                if (imageData) {
                                    await this.props.updateElement(element._id, {
                                        title: imageName,
                                        image_data: imageData,
                                    });
                                }
                                onClose();
                                this.setState({ deleteMenuOpen: false, showCamera: false });
                                if (this.state.stream) {
                                    this.state.stream.getTracks().forEach((track) => track.stop());
                                }
                            }}
                        />
                        <div className="Delete">
                            <FaTrashCan
                                className="delete-icon"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    this.setState({ deleteMenuOpen: true });
                                }}
                            />
                            {deleteMenuOpen && (
                                <div className="delete-confirmation" onClick={(e) => e.stopPropagation()}>
                                    <div className="confirm">
                                        <p>Are you sure you want to delete this item permanently?</p>
                                    </div>
                                    <div
                                        className="cancel"
                                        onClick={() => this.setState({ deleteMenuOpen: false })}
                                    >
                                        Cancel
                                    </div>
                                    <div
                                        className="delete-permanently"
                                        onClick={async () => {
                                            await this.props.deleteElement(element._id);
                                            onClose();
                                            this.setState({ deleteMenuOpen: false });
                                        }}
                                    >
                                        Delete
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    render() {
        const { isEditing } = this.props;
        return isEditing ? this.renderOpened() : this.renderClosed();
    }
}

export default Image;