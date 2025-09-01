import axios, {SERVER_URL} from "../utils/axios"

export const login = async (idNumber, password) => {
    try {
        const response = await axios.post("/auth/login", { idNumber, password });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
}

// Register a new user
export const register = async (formData) => {
    try {
        const response = await axios.post("/auth/register", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
}

// Get the current user (requires auth token)
export const getCurrentUser = async () => {
    try {
        const response = await axios.get("/auth/me");
        const user = response.data;
        if (user) {
            switch (user.role) {
                case "student":
                    user.displayRole = "Student";
                    break;
                case "mentor":
                    user.displayRole = "Mentor";
                    break;
                case "hod":
                    user.displayRole = "Head of Department";
                    break;
                default:
                    user.displayRole = "Unknown Role";
            }
        }
        return user;
    } catch (error) {
        throw error.response?.data || { error: "Failed to fetch user" };
    }
}

// Request a password reset code
export const forgotPassword = async (idNumber) => {
    try {
        const response = await axios.post("/auth/forgot-password", { idNumber });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
}

// Reset password using recovery code
export const resetPassword = async (token, password) => {
    try {
        const response = await axios.post(`/auth/reset-password/${token}`, { password });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
}

export const validateResetToken = async (token) => {
    try {
        const response = await axios.get(`/auth/reset-password/${token}`);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
}

// Delete the current user (requires auth token)
export const deleteUser = async (token) => {
    try {
        const response = await axios.delete("/auth/delete-user", {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
}

export const editProfile = async (profileData) => {
    try {
        const response = await axios.put("/auth/edit-profile", profileData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: "Failed to update profile" };
    }
}

export const uploadProfilePic = async (file) => {
    try {
        const formData = new FormData();
        formData.append("profilePic", file);
        const response = await axios.post("/auth/upload-profile-pic", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: "Failed to update profile picture" };
    }
}

export const resetProfilePic = async () => {
    try {
        const response = await axios.post("/auth/reset-profile-pic");
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: "Failed to reset profile picture" };
    }
}

export const getUserById = async (id) => {
    try {
        const response = await axios.get(`/auth/user/${id}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: "Failed to fetch user" };
    }
}