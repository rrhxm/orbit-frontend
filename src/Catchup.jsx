import React, { useState, useEffect } from "react";
import axios from "axios";

const CatchUp = ({ currentTime, elements, onClose }) => {
    const [weather, setWeather] = useState({
        location: "Southfield, MI",
        temperature: "Loading...",
        condition: "",
    });

    const formatTime = () => {
        return currentTime.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    const formatDay = () => {
        return currentTime.toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
        });
    };

    const getUpcomingTasks = () => {
        const tasks = elements
            .filter((el) => el.type === "task" && !el.completed)
            .sort((a, b) => {
                const dateA = new Date(`${a.due_date} ${a.due_time}`);
                const dateB = new Date(`${b.due_date} ${b.due_time}`);
                return dateA - dateB;
            });
        return tasks.slice(0, 2).map((task, index) => (
            <div key={index} className="catchup-task">
                <span className="task-title">{task.title || "Untitled Task"}</span>
                {task.due_date && task.due_time ? (
                    <span className="task-due"> Due {task.due_date}, {task.due_time}</span>
                ) : null}
                {task.priority === "high" && <span className="priority-high">!!</span>}
                {task.priority === "medium" && <span className="priority-medium">!</span>}
            </div>
        ));
    };

    const fetchWeather = async () => {
        try {
            const apiKey = "YOUR_OPENWEATHERMAP_API_KEY"; // Replace with your API key
            const response = await axios.get(
                `https://api.openweathermap.org/data/2.5/weather?q=Southfield,MI,US&appid=${apiKey}&units=imperial`
            );
            setWeather({
                location: "Southfield, MI",
                temperature: `${Math.round(response.data.main.temp)}°F`,
                condition: response.data.weather[0].main,
            });
        } catch (error) {
            console.error("Error fetching weather:", error);
            setWeather({
                location: "Southfield, MI",
                temperature: "N/A",
                condition: "Unable to fetch",
            });
        }
    };

    const generateCalendar = () => {
        const year = currentTime.getFullYear();
        const month = currentTime.getMonth();
        const today = currentTime.getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthName = currentTime.toLocaleString("default", { month: "long" }).toUpperCase();

        const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];
        const days = [];

        // Add empty slots for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            days.push(<span key={`empty-${i}`} className="calendar-day empty"></span>);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(
                <span
                    key={day}
                    className={`calendar-day ${day === today ? "today" : ""}`}
                >
                    {day}
                </span>
            );
        }

        return (
            <>
                <div className="calendar-header">{monthName}</div>
                <div className="calendar-days-of-week">
                    {daysOfWeek.map((day, index) => (
                        <span key={index} className="calendar-day-of-week">
                            {day}
                        </span>
                    ))}
                </div>
                <div className="calendar-days">{days}</div>
            </>
        );
    };

    useEffect(() => {
        fetchWeather();
    }, []);

    return (
        <div className="catchup-overlay" onClick={onClose}>
            <div className="catchup-expanded" onClick={(e) => e.stopPropagation()}>
                <h2>Hello Rhythm!</h2>
                <div className="catchup-content">
                    <div className="catchup-time">{formatTime()}</div>
                    <div className="catchup-day">{formatDay()}</div>
                    <div className="catchup-calendar">{generateCalendar()}</div>
                    <div className="catchup-weather">
                        {weather.location} {weather.temperature} {weather.condition}
                    </div>
                    <div className="catchup-tasks">
                        <h3>Upcoming tasks</h3>
                        {getUpcomingTasks().length > 0 ? getUpcomingTasks() : <p>No upcoming tasks</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CatchUp;