import { useEffect, useState, useMemo } from "react";
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
import {
  getCurrentUser,
  editProfile,
  uploadProfilePic,
  resetProfilePic,
  getUserById,
} from "../services/authService";
import { useAuthUser } from "../contexts/AuthUserContext";
import formatRole from "../utils/formatRole";

const PHONE_RE = /^\d{3}-\d{7}$/;
const EMAIL_RE = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;

const formatPhone = (v) => {
  const digits = (v || "").replace(/\D/g, "").slice(0, 10); // 3 + 7 = 10
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
};
const toDigits = (v, max) => (v || "").replace(/\D/g, "").slice(0, max);

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
    phoneNumber: "",
  });

  // Per-field errors
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    idNumber: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
  });

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [pendingRemovePic, setPendingRemovePic] = useState(false);

  // Fetch user
  useEffect(() => {
    (async () => {
      try {
        const userData = id ? await getUserById(id) : await getCurrentUser();
        setUser(userData);
        setForm({
          fullName: userData.fullName || "",
          email: userData.email || "",
          idNumber: toDigits(userData.idNumber, 9),
          password: "",
          confirmPassword: "",
          phoneNumber: formatPhone(userData.phoneNumber || ""),
        });
        setProfilePicPreview(userData.profilePic);
        if (!id) setIsCurrentUser(true);
      } catch (err) {
        console.error("Failed to fetch user", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Field validators (run on change & submit)
  const validateField = (name, value, other = {}) => {
    switch (name) {
      case "fullName":
        return value.trim() ? "" : "Full name is required.";
      case "email":
        return EMAIL_RE.test(value.trim()) ? "" : "Enter a valid email address.";
      case "idNumber": {
        const digits = toDigits(value, 9);
        return digits.length === 9 ? "" : "ID must be 9 digits.";
      }
      case "phoneNumber":
        return PHONE_RE.test(value) ? "" : "Phone must be in the format 123-1234567.";
      case "password":
        // Optional: only validate mismatch if confirmPassword has content
        return other.confirmPassword && value !== other.confirmPassword
          ? ""
          : ""; // no strength check here
      case "confirmPassword":
        return value && value !== other.password ? "Passwords do not match." : "";
      default:
        return "";
    }
  };

  const validateAll = (f) => {
    const next = {
      fullName: validateField("fullName", f.fullName),
      email: validateField("email", f.email),
      idNumber: validateField("idNumber", f.idNumber),
      phoneNumber: validateField("phoneNumber", f.phoneNumber),
      password: "", // no error unless we had special rules
      confirmPassword: validateField("confirmPassword", f.confirmPassword, {
        password: f.password,
      }),
    };
    // If password provided, check mismatch here
    if (f.password || f.confirmPassword) {
      next.confirmPassword =
        f.password === f.confirmPassword ? "" : "Passwords do not match.";
    }
    setErrors(next);
    return Object.values(next).every((e) => !e);
  };

  // Unified onChange with formatting
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormError("");
    setFormSuccess("");

    let nextValue = value;

    if (name === "phoneNumber") {
      nextValue = formatPhone(value);
    } else if (name === "idNumber") {
      nextValue = toDigits(value, 9);
    }

    const nextForm = { ...form, [name]: nextValue };
    setForm(nextForm);

    // Live-validate the changed field
    const err = validateField(name, nextValue, {
      password: nextForm.password,
      confirmPassword: nextForm.confirmPassword,
    });

    // For password/confirm, also re-validate the counterpart to keep them in sync
    let patch = { [name]: err };
    if (name === "password" || name === "confirmPassword") {
      const counterpart = name === "password" ? "confirmPassword" : "password";
      const counterpartErr =
        name === "password"
          ? validateField("confirmPassword", nextForm.confirmPassword, {
              password: nextForm.password,
            })
          : errors.password; // keep password err as-is (no specific rule)
      patch = { ...patch, [counterpart]: counterpartErr };
    }
    setErrors((prev) => ({ ...prev, ...patch }));
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
      idNumber: toDigits(user.idNumber || "", 9),
      password: "",
      confirmPassword: "",
      phoneNumber: formatPhone(user.phoneNumber || ""),
    });
    setProfilePicFile(null);
    setProfilePicPreview(user.profilePic);
    setPendingRemovePic(false);
    setErrors({
      fullName: "",
      email: "",
      idNumber: "",
      password: "",
      confirmPassword: "",
      phoneNumber: "",
    });
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

    const ok = validateAll(form);
    if (!ok) return;

    const updateData = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      idNumber: toDigits(form.idNumber, 9),
      phoneNumber: form.phoneNumber, // already formatted as ###-#######
    };
    if (form.password) updateData.password = form.password;

    try {
      // Update profile fields
      const res = await editProfile(updateData);
      let updatedUser = res.user;

      if (pendingRemovePic) {
        await resetProfilePic();
        updatedUser = await getCurrentUser();
        setProfilePicPreview(updatedUser.profilePic);
        setProfilePicFile(null);
        setPendingRemovePic(false);
      } else if (profilePicFile) {
        await uploadProfilePic(profilePicFile);
        updatedUser = await getCurrentUser();
        setProfilePicPreview(updatedUser.profilePic);
        setProfilePicFile(null);
      }

      setUser(updatedUser);
      setEditMode(false);
      setFormSuccess("Profile updated successfully.");
      setForm((f) => ({ ...f, password: "", confirmPassword: "" }));
    } catch (err) {
      setFormError(err.error || "Failed to update profile.");
    }
  };

  const canSeeId =
    isCurrentUser ||
    authUser?.role === "hod" ||
    (authUser?.role === "mentor" && user?.mentor?._id === authUser?._id);

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
          maxWidth: 480,
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
                <Button variant="outlined" component="label" sx={{ alignSelf: "center" }}>
                  {profilePicFile ? profilePicFile.name : "Change Profile Picture"}
                  <input type="file" accept="image/*" hidden onChange={handlePicChange} />
                </Button>
                <Button
                  variant="text"
                  color="error"
                  sx={{ alignSelf: "center" }}
                  onClick={handleRemovePic}
                  disabled={
                    (profilePicPreview && profilePicPreview.endsWith("default.png")) || pendingRemovePic
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
                  error={!!errors.fullName}
                  helperText={errors.fullName}
                />

                <TextField
                  label="Email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  fullWidth
                  required
                  error={!!errors.email}
                  helperText={errors.email}
                />

                <TextField
                  label="ID Number"
                  name="idNumber"
                  value={form.idNumber}
                  onChange={handleChange}
                  fullWidth
                  required
                  inputProps={{ inputMode: "numeric", maxLength: 9, pattern: "\\d{9}" }}
                  error={!!errors.idNumber}
                  helperText={errors.idNumber || "9 digits"}
                />

                <TextField
                  label="Phone Number"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  fullWidth
                  inputProps={{ inputMode: "numeric", maxLength: 11, pattern: "\\d{3}-\\d{7}" }}
                  error={!!errors.phoneNumber}
                  helperText={errors.phoneNumber || "Format: 123-1234567"}
                />

                <TextField
                  label="New Password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  fullWidth
                  error={!!errors.password}
                  helperText={errors.password}
                />

                <TextField
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  fullWidth
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
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
              {canSeeId && <InfoRow label="ID Number" value={user.idNumber} />}
              <InfoRow label="Phone Number" value={user.phoneNumber} />
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
                <Button variant="contained" onClick={handleEdit} sx={{ alignSelf: "flex-end", mt: 2 }}>
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
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="90vh">
      {children}
    </Box>
  );
}
