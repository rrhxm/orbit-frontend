import React, { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

const AuthContext = createContext(null); // ✅ Ensure default value

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const auth = getAuth();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const logout = async () => {
        try {
            await signOut(auth);
            console.log("User signed out");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    // Add getIdToken function to retrieve the Firebase token
    const getIdToken = async () => {
        if (!user) {
            throw new Error("No user is currently signed in");
        }
        try {
            const token = await user.getIdToken();
            return token;
        } catch (error) {
            console.error("Error getting ID token:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, logout, getIdToken }}>
            {children}
        </AuthContext.Provider>
    );
};

// ✅ Correct named export
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};