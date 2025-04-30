import React from "react";

const CatchUp = ({ currentTime, elements, onClose }) => {
    const formatTime = () => {
        return `${currentTime.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })}`;
    };

    const formatDay = () => {
        return currentTime.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
    };

    const getUpcomingTasks = () => {
        // Mock data for upcoming tasks (replace with actual task data from elements if available)
        const tasks = elements.filter(el => el.type === "task" && !el.completed);
        return tasks.slice(0, 2).map((task, index) => (
            <div key={index} className="catchup-task">
                {task.title || "Untitled Task"} {task.due_date && task.due_time ? `Due ${task.due_date}, ${task.due_time}` : ""}
                {task.priority === "high" && <span>!!</span>} {task.priority === "medium" && <span>!</span>}
            </div>
        ));
    };

    const getWeather = () => {
        // Mock weather data (replace with API call if needed)
        return {
            location: "Southfield, MI",
            temperature: "75°F",
            condition: "Cloudy",
        };
    };

    const weather = getWeather();

    return (
        <div className="catchup-overlay" onClick={onClose}>
            <div className="catchup-expanded" onClick={(e) => e.stopPropagation()}>
                <h2>Hello Rhythm!</h2>
                <div className="catchup-content">
                    <div className="catchup-time">{formatTime()}</div>
                    <div className="catchup-day">{formatDay()}</div>
                    <div className="catchup-calendar">
                        {/* Mock calendar (replace with actual calendar component if needed) */}
                        <div>AUGUST</div>
                        <div>10:09 Wed Thu 11</div>
                        <div>2 3 4 5 6 7 8</div>
                        <div>9 10 11 12 13 14 15</div>
                        <div>16 17 18 19 20 21 22</div>
                        <div>23 24 25 26 27 28 29</div>
                        <div>30 31</div>
                    </div>
                    <div className="catchup-weather">
                        {weather.location} {weather.temperature} {weather.condition}
                    </div>
                    <div className="catchup-tasks">
                        <h3>Upcoming tasks</h3>
                        {getUpcomingTasks().length > 0 ? getUpcomingTasks() : <p>No upcoming tasks</p>}
                    </div>
                    <div className="catchup-elements">
                        Total elements in youe space {elements.length}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CatchUp;