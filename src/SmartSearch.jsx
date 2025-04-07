import React, { useState, useEffect } from "react";
import Note from "./elements/Note";
import Task from "./elements/Task";
import Image from "./elements/Image";
import Audio from "./elements/Audio";
import axios from "axios";
import "./assets/SmartSearch.css";
import { IoSearch } from "react-icons/io5";
import { LuOrbit } from "react-icons/lu";


const SmartSearch = ({
    elements,
    onNavigate,
    onDoubleClick,
    updateElement,
    deleteElement,
    userId,
    setEditingElement,
    isVisible,
    onClose,
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [normalSearchResults, setNormalSearchResults] = useState([]);
    const [smartSearchResult, setSmartSearchResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    // Debounce function
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // Normal search (keyword-based)
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setNormalSearchResults([]);
            setSmartSearchResult(null);
            setErrorMessage(null);
            return;
        }

        const fetchNormalSearchResults = async () => {
            setIsLoading(true);
            setErrorMessage(null);
            try {
                const response = await axios.get("/search", {
                    params: {
                        user_id: userId,
                        query: searchQuery,
                    },
                });
                console.log("Normal search response:", response.data);
                if (!Array.isArray(response.data)) {
                    throw new Error("Unexpected response format: results should be an array");
                }
                setNormalSearchResults(response.data);
            } catch (error) {
                console.error("Error fetching normal search results:", error);
                setNormalSearchResults([]);
                setErrorMessage(error.response?.data?.detail || "Failed to fetch search results. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        const debouncedFetch = debounce(fetchNormalSearchResults, 500);
        debouncedFetch();
    }, [searchQuery, userId]);

    // Smart search (triggered by button)
    const handleSmartSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsLoading(true);
        setErrorMessage(null);

        try {
            const response = await axios.get("/smart_search", {
                params: {
                    user_id: userId,
                    query: searchQuery,
                },
            });
            console.log("Smart search response:", response.data);
            setSmartSearchResult(response.data);
        } catch (error) {
            console.error("Error fetching smart search results:", error);
            setSmartSearchResult({
                answer: "An error occurred while processing your request.",
                elements: [],
            });
        } finally {
            setIsLoading(false);
        }
    };

    const renderElement = (el) => {
        const commonProps = {
            element: el,
            isEditing: false,
            onDoubleClick: () => onDoubleClick(el),
            onDragStart: () => {},
            onDragEnd: () => {},
            updateElement,
            deleteElement,
            onClose: () => setEditingElement(null),
            userId,
        };

        return (
            <div
                className="search-result-item"
                onClick={() => onNavigate(el.x, el.y)}
                onDoubleClick={() => onDoubleClick(el)}
            >
                {el.type === "note" && <Note {...commonProps} />}
                {el.type === "task" && <Task {...commonProps} />}
                {el.type === "image" && <Image {...commonProps} />}
                {el.type === "audio" && <Audio {...commonProps} />}
                {el.similarity && (
                    <div className="similarity-score">
                        Relevance: {(el.similarity * 100).toFixed(2)}%
                    </div>
                )}
            </div>
        );
    };

    if (!isVisible) return null;

    return (
        <div className="search-overlay" onClick={onClose}>
            

        <div className="smart-search-section" onClick={(e) => e.stopPropagation()}>
            <div className="search-bar">
                <IoSearch alt="Search" className="search-icon" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search"
                    className="search-input"
                />
                <button className="smart-search-button" onClick={handleSmartSearch}>
                <LuOrbit />
                </button>
            </div>

            <div className="search-results">
                {isLoading ? (
                    <div className="loading">Loading...</div>
                ) : errorMessage ? (
                    <div className="error-message">{errorMessage}</div>
                ) : searchQuery.trim() === "" ? (
                    <div className="empty-search">
                        <p>Nothing yet</p>
                    </div>
                ) : (
                    <div className="search-results-content">
                        {smartSearchResult && (
                            <div className="smart-search-answer">
                                <p>{smartSearchResult.answer}</p>
                            </div>
                        )}
                        <div className="search-results-list">
                            {smartSearchResult ? (
                                smartSearchResult.elements.length > 0 ? (
                                    smartSearchResult.elements.map((el) => (
                                        <div key={el._id}>{renderElement(el)}</div>
                                    ))
                                ) : (
                                    <div className="no-result">
                                        <p>No related elements found.</p>
                                    </div>
                                )
                            ) : normalSearchResults.length > 0 ? (
                                normalSearchResults.map((el) => (
                                    <div key={el._id}>{renderElement(el)}</div>
                                ))
                            ) : (
                                <div className="no-result">
                                    <p>No results found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
};

export default SmartSearch;