import React from "react";
import { BiCollapseAlt } from "react-icons/bi";
import { FaTrashCan } from "react-icons/fa6";
import { HiMiniPencilSquare } from "react-icons/hi2";




class Note extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            editTitle: props.element.title || "",
            editText: props.element.content || "",
            deleteMenuOpen: false,
            isNew: !props.element.title && !props.element.content, // Flag for new notes
            hasChanges: false, // Track if changes have been made
        };
    }

    // Handle changes to detect if the note has been edited
    handleChange = (field, value) => {
        this.setState({ [field]: value, hasChanges: true });
    };

    // Handle double-click to start editing
    handleDoubleClick = () => {
        this.props.onDoubleClick(this.props.element);
    };

    // Render the note in its closed form
    renderClosed() {
        const { element } = this.props;
        if (this.state.isNew) {
            return (
                <div
                    className="note-placeholder"
                    style={{ left: element.x, top: element.y }}
                    draggable
                    onDragStart={this.props.onDragStart}
                    onDragEnd={this.props.onDragEnd}
                    onDoubleClick={this.handleDoubleClick}
                >
                    <HiMiniPencilSquare className="placeholder-icon" />
                </div>
            );
        }
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
        const { editTitle, editText, deleteMenuOpen, hasChanges } = this.state;

        return (
            <div className="note-overlay">
                <div className="expanded-note">
                    {/* Editable Title */}
                    <input
                        type="text"
                        className="note-title-input"
                        value={editTitle}
                        onChange={(e) => this.handleChange("editTitle", e.target.value)}
                        placeholder="Untitled Note"
                        autoFocus
                    />

                    <div className="note-separator"></div>

                    {/* Editable Content */}
                    <textarea
                        className="note-textarea"
                        value={editText}
                        onChange={(e) => this.handleChange("editText", e.target.value)}
                        placeholder="Add Text"
                    />

                    <div className="actions">
                        <BiCollapseAlt
                            className="close-icon"
                            onClick={async () => {
                                const finalTitle = editTitle.trim() === "" ? `Note - ${new Date().toLocaleDateString()}` : editTitle;
                                const updates = {
                                    content: editText,
                                    title: finalTitle,
                                };
                                if (hasChanges) { // Only update if the user made changes
                                    await this.props.updateElement(element._id, updates);
                                    this.setState({ isNew: false, hasChanges: false });
                                }
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