import React from "react";
import { BiCollapseAlt } from "react-icons/bi";
import { AiFillInfoCircle } from "react-icons/ai";
import { IoIosBug } from "react-icons/io";
import { FaTrashCan } from "react-icons/fa6";

class Profile extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            deleteMenuOpen: false,
        };
    }

    handleClose = () => {
        this.props.onClose();
    };

    render() {
        const { user, handleLogout } = this.props;
        const { deleteMenuOpen } = this.state;

        return (
            <div className="profile-overlay">
                <div className="expanded-profile">
                    <div className="profile-header">
                        <AiFillInfoCircle className="info-icon" />
                        <IoIosBug className="report-icon" />
                    </div>
                    <div className="profile-content">
                        <img src={user?.photoURL} alt="Profile" className="profile-pic" />
                        <div className="profile-details">
                            <div className="profile-name">{user?.displayName || "User"}</div>
                            <div className="profile-email">{user?.email || "No email"}</div>
                        </div>
                    </div>
                    <div className="profile-actions">
                        <button className="delete-account-button">
                            Delete Account
                        </button>
                        <button className="logout-button" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                    {/* <BiCollapseAlt className="close-icon" onClick={this.handleClose} /> */}
                </div>
            </div>
        );
    }
}

export default Profile;