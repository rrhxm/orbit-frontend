import React from "react";
import { BiCollapseAlt } from "react-icons/bi";
import { FaTrashCan } from "react-icons/fa6";

// Note component that extends the base Element class
class Note extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            editTitle: props.element.title || `Note - ${new Date().toLocaleDateString()}`,
            editText: props.element.content || "",
            deleteMenuOpen: false,
        };
    }

    // Handle double-click to start editing
    handleDoubleClick = () => {
        this.props.onDoubleClick(this.props.element);
    };

    // Render the note in its closed form
    renderClosed() {
        const { element } = this.props;
        return (
            <div
                className="note-box"
                style={{ left: element.x, top: element.y }}
                draggable
                onDragStart={this.props.onDragStart}
                onDragEnd={this.props.onDragEnd}
                onDoubleClick={this.handleDoubleClick}
            >
                <div className="note-title">{element.title}</div>
                <div className="note-content">{element.content}</div>
            </div>
        );
    }

    // Render the note in its opened (editing) form
    renderOpened() {
        const { element, onClose } = this.props;
        const { editTitle, editText, deleteMenuOpen } = this.state;

        return (
            <div className="note-overlay">
                <div className="expanded-note">
                    {/* Editable Title */}
                    <input
                        type="text"
                        className="note-title-input"
                        value={editTitle}
                        onChange={(e) => this.setState({ editTitle: e.target.value })}
                        placeholder="Untitled Note"
                        autoFocus
                    />

                    <div className="note-separator"></div>

                    {/* Editable Content */}
                    <textarea
                        className="note-textarea"
                        value={editText}
                        onChange={(e) => this.setState({ editText: e.target.value })}
                        placeholder="Add Text"
                        autoFocus
                    />

                    <div className="actions">
                        <BiCollapseAlt
                            className="close-icon"
                            onClick={async () => {
                                const finalTitle = editTitle.trim() === "" ? "Untitled Note" : editTitle;
                                await this.props.updateElement(element._id, {
                                    content: editText,
                                    title: finalTitle,
                                });
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
                                    <div className="cancel" onClick={() => this.setState({ deleteMenuOpen: false })}>
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

export default Note;