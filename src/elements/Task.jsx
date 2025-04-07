import React from "react";
import { BiCollapseAlt } from "react-icons/bi";
import { FaTrashCan, FaExclamation } from "react-icons/fa6";
import { IoCheckmarkCircleOutline, IoCheckmarkCircle } from "react-icons/io5";
import { MdOutlineAutorenew } from "react-icons/md";
import { MdOutlineAddTask } from "react-icons/md";

class Task extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editTitle: props.element.title || "", // Start with empty title
      editDueDate: props.element.due_date || "",
      editDueTime: props.element.due_time || "",
      editPriority: props.element.priority || "low",
      editRepeat: props.element.repeat || "no",
      editCompleted: props.element.completed || false,
      editLastReset: props.element.last_reset || new Date().toISOString().split("T")[0],
      deleteMenuOpen: false,
      isEdited: props.element.is_edited || false, // Track if the task has been edited
    };
  }

  // Lifecycle method to check for reset after the component mounts
  componentDidMount() {
    this.checkAndResetTask();
  }

  // Lifecycle method to check for reset after the component updates
  componentDidUpdate(prevProps, prevState) {
    // Only check for reset if relevant state or props have changed
    if (
      prevState.editRepeat !== this.state.editRepeat ||
      prevState.editLastReset !== this.state.editLastReset ||
      prevState.editCompleted !== this.state.editCompleted ||
      prevProps.element !== this.props.element
    ) {
      this.checkAndResetTask();
    }
  }

  handleDoubleClick = () => {
    this.props.onDoubleClick(this.props.element);
  };

  // Format the due date for display
  formatDueDate(dueDate, dueTime) {
    if (!dueDate) return "No due date";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
    const time = dueTime ? new Date(`1970-01-01T${dueTime}:00`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";

    if (diffDays === 0) return `Due Today, ${time}`;
    if (diffDays === -1) return `Due Yesterday, ${time}`;
    if (diffDays === 1) return `Due Tomorrow, ${time}`;
    return `Due ${due.toLocaleDateString()}, ${time}`;
  }

  // Render priority indicators
  renderPriority(priority) {
    if (priority === "low") {
      return <span className="priority-low">!</span>;
    } else if (priority === "medium") {
      return <span className="priority-medium">!!</span>;
    } else if (priority === "high") {
      return <span className="priority-high">!!!</span>;
    }
    return null;
  }

  // Check if a repeating task needs to reset and update the state and backend
  checkAndResetTask = async () => {
    const { editRepeat, editLastReset, editCompleted } = this.state;
    const { element, updateElement } = this.props;

    if (editRepeat === "yes") {
      const today = new Date().toISOString().split("T")[0];
      if (editLastReset !== today && editCompleted) {
        // Update the state
        this.setState({
          editCompleted: false,
          editLastReset: today,
          isEdited: true,
        });

        // Update the backend
        try {
          await updateElement(element._id, {
            completed: false,
            last_reset: today,
            is_edited: true,
          });
        } catch (error) {
          console.error("Error updating task on reset:", error);
        }
      }
    }
  };

  // Toggle completion status
  toggleCompletion = async () => {
    const { editCompleted, isEdited } = this.state;
    const { element } = this.props;
    const today = new Date().toISOString().split("T")[0];
    this.setState(
      { editCompleted: !editCompleted, editLastReset: today, isEdited: true }, // Mark as edited when completing
      async () => {
        await this.props.updateElement(element._id, {
          completed: this.state.editCompleted,
          last_reset: today,
          is_edited: true,
        });
      }
    );
  };

  renderClosed() {
    const { element } = this.props;
    const { editDueDate, editDueTime, editPriority, editRepeat, editCompleted, isEdited } = this.state;

    // If the task has not been edited, render the placeholder
    if (!isEdited) {
      return (
        <div
          className="task-placeholder"
          style={{ left: element.x, top: element.y }}
          draggable
          onDragStart={this.props.onDragStart}
          onDragEnd={this.props.onDragEnd}
          onDoubleClick={this.handleDoubleClick}
        >
          <MdOutlineAddTask className="task-placeholder-icon" />
          <span>Add Task</span>
        </div>
      );
    }

    // Use "Task" as the default title if none is provided
    const displayTitle = element.title && element.title.trim() !== "" ? element.title : "Task";

    return (
      <div
        className="task-box"
        style={{ left: element.x, top: element.y }}
        draggable
        onDragStart={this.props.onDragStart}
        onDragEnd={this.props.onDragEnd}
        onDoubleClick={this.handleDoubleClick}
      >
        <div className="task-title">{displayTitle}</div>
        <div className="task-meta">
          {this.renderPriority(editPriority)}
          {editRepeat === "yes" && <MdOutlineAutorenew className="repeat-icon" />}
        </div>
        <div className="task-due-date">{this.formatDueDate(editDueDate, editDueTime)}</div>
        <div className="task-completion">
          {editCompleted ? (
            <IoCheckmarkCircle className="completed-icon" onClick={this.toggleCompletion} />
          ) : (
            <IoCheckmarkCircleOutline className="complete-icon" onClick={this.toggleCompletion} />
          )}
        </div>
      </div>
    );
  }

  renderOpened() {
    const { element, onClose } = this.props;
    const { editTitle, editDueDate, editDueTime, editPriority, editRepeat, editCompleted, deleteMenuOpen } = this.state;

    return (
      <div className="task-overlay">
        <div className="expanded-task">
          <input
            type="text"
            className="task-title-input"
            value={editTitle}
            onChange={(e) => this.setState({ editTitle: e.target.value, isEdited: true })}
            placeholder="Untitled Task"
            autoFocus
          />
          <div className="task-separator"></div>
          <div className="task-options">
            <div className="task-option">
              <label>Due Date:</label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => this.setState({ editDueDate: e.target.value, isEdited: true })}
              />
            </div>
            <div className="task-option">
              <label>Due Time:</label>
              <input
                type="time"
                value={editDueTime}
                onChange={(e) => this.setState({ editDueTime: e.target.value, isEdited: true })}
              />
            </div>
            <div className="task-option">
              <label>Priority:</label>
              <select
                value={editPriority}
                onChange={(e) => this.setState({ editPriority: e.target.value, isEdited: true })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="task-option">
              <label>Repeat Daily:</label>
              <select
                value={editRepeat}
                onChange={(e) => this.setState({ editRepeat: e.target.value, isEdited: true })}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="task-option">
              <label>Completed:</label>
              <input
                type="checkbox"
                checked={editCompleted}
                onChange={(e) => this.setState({ editCompleted: e.target.checked, isEdited: true })}
              />
            </div>
          </div>

          <div className="actions">
            <BiCollapseAlt
              className="close-icon"
              onClick={async () => {
                const finalTitle = editTitle.trim() === "" ? "Task" : editTitle; // Default to "Task" if empty
                const today = new Date().toISOString().split("T")[0];
                await this.props.updateElement(element._id, {
                  title: finalTitle,
                  due_date: editDueDate,
                  due_time: editDueTime,
                  priority: editPriority,
                  repeat: editRepeat,
                  completed: editCompleted,
                  last_reset: today,
                  is_edited: this.state.isEdited,
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

export default Task;