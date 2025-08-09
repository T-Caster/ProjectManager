import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Box,
    Avatar,
    Typography,
    Stack,
    Paper,
    CircularProgress,
    Divider,
    TextField,
    Button,
    Alert,
    Link,
} from "@mui/material";
import { getCurrentUser, editProfile, uploadProfilePic, resetProfilePic, getUserById } from "../services/authService";
import { useAuthUser } from "../contexts/AuthUserContext";
import formatRole from "../utils/formatRole";

export default function ProfilePage() {
    const { id } = useParams();
    const { user: authUser } = useAuthUser();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isCurrentUser, setIsCurrentUser] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        fullName: "",
        email: "",
        idNumber: "",
        password: "",
        confirmPassword: "",
    });
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");
    const [profilePicFile, setProfilePicFile] = useState(null);
    const [profilePicPreview, setProfilePicPreview] = useState(null);
    const [pendingRemovePic, setPendingRemovePic] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userData = id ? await getUserById(id) : await getCurrentUser();
                setUser(userData);
                setForm({
                    fullName: userData.fullName || "",
                    email: userData.email || "",
                    idNumber: userData.idNumber || "",
                    password: "",
                    confirmPassword: "",
                });
                setProfilePicPreview(userData.profilePic);
                if (!id) setIsCurrentUser(true);
            } catch (err) {
                console.error("Failed to fetch user", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id]);

    const handleChange = e => {
        setFormError("");
        setFormSuccess("");
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    };

    const handleEdit = () => {
        setEditMode(true);
        setFormError("");
        setFormSuccess("");
    };

    const handleRemovePic = () => {
        setFormError("");
        setFormSuccess("");
        setProfilePicFile(null);
        setProfilePicPreview("/uploads/default.png");
        setPendingRemovePic(true);
    };

    const handleCancel = () => {
        setEditMode(false);
        setFormError("");
        setFormSuccess("");
        setForm({
            fullName: user.fullName || "",
            email: user.email || "",
            idNumber: user.idNumber || "",
            password: "",
            confirmPassword: "",
        });
        setProfilePicFile(null);
        setProfilePicPreview(user.profilePic); // Reset preview to original
        setPendingRemovePic(false);
    };

    const handlePicChange = (e) => {
        setProfilePicFile(e.target.files[0]);
        if (e.target.files[0]) {
            setProfilePicPreview(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        setFormSuccess("");

        if (!form.fullName) return setFormError("Full name is required.");
        if (!form.email || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(form.email)) {
            return setFormError("Enter a valid email address.");
        }
        if (!form.idNumber || form.idNumber.length !== 9 || !/^\d+$/.test(form.idNumber)) {
            return setFormError("ID must be 9 digits.");
        }
        if (form.password && form.password !== form.confirmPassword) {
            return setFormError("Passwords do not match.");
        }

        const updateData = {
            fullName: form.fullName,
            email: form.email,
            idNumber: form.idNumber,
        };
        if (form.password) updateData.password = form.password;

        try {
            // Update profile fields
            const res = await editProfile(updateData);

            let updatedUser = res.user;

            // If user requested to remove the profile picture
            if (pendingRemovePic) {
                const resetRes = await resetProfilePic();
                const freshUser = await getCurrentUser();
                updatedUser = freshUser;
                setProfilePicPreview(freshUser.profilePic);
                setProfilePicFile(null);
                setPendingRemovePic(false);
            }
            // If a new profile picture was selected, upload it using authService
            else if (profilePicFile) {
                const picRes = await uploadProfilePic(profilePicFile);
                const freshUser = await getCurrentUser();
                updatedUser = freshUser;
                setProfilePicPreview(freshUser.profilePic);
                setProfilePicFile(null);
            }

            setUser(updatedUser);
            setEditMode(false);
            setFormSuccess("Profile updated successfully.");
            setForm(f => ({ ...f, password: "", confirmPassword: "" }));
        } catch (err) {
            setFormError(err.error || "Failed to update profile.");
        }
    };

    if (loading) {
        return (
            <CenteredBox>
                <CircularProgress />
            </CenteredBox>
        );
    }

    if (!user) {
        return (
            <CenteredBox>
                <Typography color="error">Failed to load profile.</Typography>
            </CenteredBox>
        );
    }

    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="flex-start"
            sx={{ backgroundColor: "background.default", px: 2, pt: 4 }}
        >
            <Paper
                elevation={6}
                sx={{
                    p: 4,
                    borderRadius: 3,
                    width: "100%",
                    maxWidth: 450,
                    bgcolor: "background.paper",
                }}
            >
                <Stack spacing={3} alignItems="center">
                    <Avatar
                        src={profilePicPreview || user.profilePic}
                        alt={user.fullName}
                        sx={{
                            width: 110,
                            height: 110,
                            boxShadow: 3,
                            border: "3px solid",
                            borderColor: "primary.main",
                        }}
                    />
                    <Typography variant="h5" fontWeight={600}>
                        {user.fullName}
                    </Typography>
                    <Divider sx={{ width: "100%", my: 1 }} />
                    {editMode ? (
                        <Box component="form" onSubmit={handleSubmit} width="100%" encType="multipart/form-data">
                            <Stack spacing={2}>
                                <Button
                                    variant="outlined"
                                    component="label"
                                    sx={{ alignSelf: "center" }}
                                >
                                    {profilePicFile ? profilePicFile.name : "Change Profile Picture"}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={handlePicChange}
                                    />
                                </Button>
                                <Button
                                    variant="text"
                                    color="error"
                                    sx={{ alignSelf: "center" }}
                                    onClick={handleRemovePic}
                                    disabled={
                                        (profilePicPreview && profilePicPreview.endsWith("default.png")) ||
                                        pendingRemovePic
                                    }
                                >
                                    Remove Profile Picture
                                </Button>
                                <TextField
                                    label="Full Name"
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                />
                                <TextField
                                    label="Email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                />
                                <TextField
                                    label="ID Number"
                                    name="idNumber"
                                    value={form.idNumber}
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                    slotProps={{ htmlInput: { maxLength: 9 } }}
                                />
                                <TextField
                                    label="New Password"
                                    name="password"
                                    type="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    fullWidth
                                />
                                <TextField
                                    label="Confirm New Password"
                                    name="confirmPassword"
                                    type="password"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    fullWidth
                                />
                                <Stack direction="row" spacing={2} justifyContent="flex-end">
                                    <Button variant="outlined" onClick={handleCancel}>
                                        Cancel
                                    </Button>
                                    <Button variant="contained" type="submit">
                                        Save
                                    </Button>
                                </Stack>
                                {formError && <Alert severity="error">{formError}</Alert>}
                                {formSuccess && <Alert severity="success">{formSuccess}</Alert>}
                            </Stack>
                        </Box>
                    ) : (
                        <Stack spacing={2} width="100%">
                            <InfoRow label="Email" value={user.email} />
                            {(isCurrentUser || authUser?.role === 'hod' || (authUser?.role === 'mentor' && user?.mentor?._id === authUser?._id)) && <InfoRow label="ID Number" value={user.idNumber} />}
                            <InfoRow label="Role" value={formatRole(user.role)} />
                            {user.mentor && (
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography color="text.secondary" fontWeight={500}>
                                        Mentor
                                    </Typography>
                                    <Link
                                        component="button"
                                        variant="body1"
                                        onClick={() => navigate(`/profile/${user.mentor._id}`)}
                                        sx={{ fontWeight: 500 }}
                                    >
                                        {user.mentor.fullName}
                                    </Link>
                                </Box>
                            )}
                            {isCurrentUser && (
                                <Button
                                    variant="contained"
                                    onClick={handleEdit}
                                    sx={{ alignSelf: "flex-end", mt: 2 }}
                                >
                                    Edit Profile
                                </Button>
                            )}
                            {formSuccess && <Alert severity="success">{formSuccess}</Alert>}
                        </Stack>
                    )}
                </Stack>
            </Paper>
        </Box>
    );
}

function InfoRow({ label, value }) {
    return (
        <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography color="text.secondary" fontWeight={500}>
                {label}
            </Typography>
            <Typography color="text.primary" fontWeight={500}>
                {value}
            </Typography>
        </Box>
    );
}

function CenteredBox({ children }) {
    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="90vh"
        >
            {children}
        </Box>
    );
}