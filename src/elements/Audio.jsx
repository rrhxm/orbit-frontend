import React from "react";
import { BiCollapseAlt } from "react-icons/bi";
import { FaTrashCan } from "react-icons/fa6";
import { IoMicCircle } from "react-icons/io5";
import { FaCirclePlay, FaCirclePause, FaMicrophone } from "react-icons/fa6";
import { BsFillPlayCircleFill } from "react-icons/bs";
import { BsFillPauseCircleFill } from "react-icons/bs";
import axios from "axios";

class Audio extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            audioData: props.element.audio_data || null,
            audioTitle: props.element.title || `Audio ${new Date().toLocaleDateString()}`,
            transcription: props.element.transcription || null,
            isTranscribing: false,
            deleteMenuOpen: false,
            isRecording: false,
            mediaRecorder: null,
            audioChunks: [],
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            isNew: !props.element.audio_data && !props.element.title,
        };
        this.audioRef = React.createRef();
        this.maxDuration = 30 * 60 * 1000;
    }

    componentDidMount() {
        if (this.audioRef.current) {
            this.audioRef.current.addEventListener("timeupdate", this.updateTime);
            this.audioRef.current.addEventListener("loadedmetadata", this.setDuration);
            this.audioRef.current.addEventListener("ended", this.handleAudioEnded);
        }
    }

    componentWillUnmount() {
        if (this.state.mediaRecorder && this.state.isRecording) {
            this.state.mediaRecorder.stop();
        }
        if (this.audioRef.current) {
            this.audioRef.current.removeEventListener("timeupdate", this.updateTime);
            this.audioRef.current.removeEventListener("loadedmetadata", this.setDuration);
            this.audioRef.current.removeEventListener("ended", this.handleAudioEnded);
        }
    }

    updateTime = () => {
        if (this.audioRef.current) {
            this.setState({ currentTime: this.audioRef.current.currentTime });
        }
    };

    setDuration = () => {
        if (this.audioRef.current) {
            const duration = this.audioRef.current.duration;
            if (!isNaN(duration) && duration !== Infinity) {
                this.setState({ duration });
            } else {
                this.setState({ duration: 0 });
            }
        }
    };

    handleAudioEnded = () => {
        this.setState({ isPlaying: false, currentTime: 0 });
    };

    handleDoubleClick = () => {
        this.props.onDoubleClick(this.props.element);
    };

    startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                const reader = new FileReader();
                reader.onloadend = () => {
                    this.setState({
                        audioData: reader.result,
                        audioChunks: [],
                        isRecording: false,
                    }, () => {
                        if (this.state.isNew) {
                            this.handleSave();
                        }
                    });
                    stream.getTracks().forEach((track) => track.stop());
                };
                reader.readAsDataURL(audioBlob);
            };

            mediaRecorder.start();
            this.setState({ mediaRecorder, audioChunks, isRecording: true });

            setTimeout(() => {
                if (mediaRecorder.state === "recording") {
                    mediaRecorder.stop();
                }
            }, this.maxDuration);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Failed to access microphone. Please ensure you have granted permission.");
        }
    };

    stopRecording = () => {
        if (this.state.mediaRecorder && this.state.isRecording) {
            this.state.mediaRecorder.stop();
        }
    };

    togglePlayPause = () => {
        if (this.audioRef.current) {
            if (this.state.isPlaying) {
                this.audioRef.current.pause();
            } else {
                this.audioRef.current.play();
            }
            this.setState((prevState) => ({ isPlaying: !prevState.isPlaying }));
        }
    };

    handleSeek = (event) => {
        if (this.audioRef.current) {
            const seekTime = (event.target.value / 100) * this.state.duration;
            this.audioRef.current.currentTime = seekTime;
            this.setState({ currentTime: seekTime });
        }
    };

    handleTranscribe = async () => {
        this.setState({ isTranscribing: true });
        try {
            const response = await axios.post(
                `/transcribe/${this.props.element._id}`,
                {},
                { params: { user_id: this.props.userId } }
            );
            const transcription = response.data.transcription;
            this.setState({
                transcription: transcription,
                isTranscribing: false,
            });
            // Update parent state to reflect the transcription
            if (this.props.onUpdate) {
                this.props.onUpdate({
                    ...this.props.element,
                    transcription: transcription,
                });
            }
            // Optionally, update the element in the database (already handled by backend)
            await this.props.updateElement(this.props.element._id, {
                transcription: transcription,
            });
        } catch (error) {
            console.error("Error transcribing audio:", error.response?.data || error.message);
            this.setState({ isTranscribing: false });
            alert(
                error.response?.data?.detail ||
                "Failed to transcribe audio. Please try again."
            );
        }
    };

    formatTime = (seconds) => {
        if (isNaN(seconds) || seconds === Infinity) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
    };

    handleSave = async () => {
        const updates = {};
        const finalTitle = this.state.audioTitle.trim() === "" ? "Untitled Audio" : this.state.audioTitle;
        if (this.state.audioData && (!this.props.element.audio_data || this.state.audioData !== this.props.element.audio_data)) {
            updates.audio_data = this.state.audioData;
        }
        if (finalTitle !== this.props.element.title) {
            updates.title = finalTitle;
        }
        if (Object.keys(updates).length > 0) {
            try {
                await this.props.updateElement(this.props.element._id, updates);
                if (this.props.onUpdate) {
                    this.props.onUpdate({ ...this.props.element, ...updates });
                }
                this.setState({ isNew: false });
            } catch (error) {
                console.error("Failed to save audio:", error);
            }
        }
    };

    renderClosed() {
        const { element } = this.props;
        return (
            <div
                className="audio-box"
                style={{ left: element.x, top: element.y }}
                draggable
                onDragStart={this.props.onDragStart}
                onDragEnd={this.props.onDragEnd}
                onDoubleClick={this.handleDoubleClick}
            >
                {element.audio_data ? (
                    <div className="audio-player">
                        <div onClick={this.togglePlayPause} className="play-pause-button">
                            {this.state.isPlaying ? <BsFillPauseCircleFill /> : <BsFillPlayCircleFill />}
                        </div>
                        <audio ref={this.audioRef} src={element.audio_data} style={{ display: "none" }} />
                        <span className="audio-title">{this.state.audioTitle}</span>
                    </div>
                ) : (
                    <div className="audio-placeholder">
                        <IoMicCircle className="mic-icon" />
                        <span>Record Audio</span>
                    </div>
                )}
            </div>
        );
    }

    renderOpened() {
        const { element, onClose } = this.props;
        const { audioData, audioTitle, transcription, isTranscribing, deleteMenuOpen, isRecording, isPlaying, currentTime, duration } = this.state;

        return (
            <div className="audio-overlay">
                <div className="expanded-audio">
                    <input
                        type="text"
                        className="audio-title-input"
                        value={audioTitle}
                        onChange={(e) => this.setState({ audioTitle: e.target.value })}
                        placeholder="Untitled Audio"
                        autoFocus
                    />
                    <div className="audio-separator"></div>

                    {audioData ? (
                        <div className="audio-player-expanded">
                            <div onClick={this.togglePlayPause} className="play-pause-button-expanded">
                                {isPlaying ? <FaCirclePause /> : <FaCirclePlay />}
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={duration > 0 ? (currentTime / duration) * 100 : 0}
                                onChange={this.handleSeek}
                                className="audio-seek-bar-expanded"
                            />
                            <span className="audio-duration-expanded">{this.formatTime(duration)}</span>
                            <audio ref={this.audioRef} src={audioData} style={{ display: "none" }} />
                        </div>
                    ) : (
                        <div className="audio-recording">
                            <FaMicrophone
                                className={`mic-icon-expanded ${isRecording ? "recording" : ""}`}
                                onClick={isRecording ? this.stopRecording : this.startRecording}
                            />
                            {isRecording && <div className="wave-animation"></div>}
                        </div>
                    )}

                    <div className="transcription-section">
                        {transcription ? (
                            <>
                                <h4>Transcription</h4>
                                <div className="transcription-text">{transcription}</div>
                            </>
                        ) : isTranscribing ? (
                            <div className="shimmer">
                                <div className="shimmer-line"></div>
                                <div className="shimmer-line"></div>
                                <div className="shimmer-line"></div>
                            </div>
                        ) : audioData ? (
                            <button
                                onClick={this.handleTranscribe}
                                disabled={isTranscribing}
                                className={isTranscribing ? "transcribe-button disabled" : "transcribe-button"}
                            >
                                {isTranscribing ? "Transcribing..." : "Transcribe Audio"}
                            </button>
                        ) : null}

                        <div className="actions">
                            <BiCollapseAlt
                                className="close-icon"
                                onClick={async () => {
                                    await this.handleSave();
                                    onClose();
                                    this.setState({ deleteMenuOpen: false });
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
            </div>
        );
    }

    render() {
        const { isEditing } = this.props;
        return isEditing ? this.renderOpened() : this.renderClosed();
    }
}

export default Audio;