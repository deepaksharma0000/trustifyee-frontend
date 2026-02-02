
import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Stack,
  Box,
  Fade,
} from "@mui/material";

type OTPModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (otp: string) => void;
  apiEndpoint?: string; // optional now
  pendingToken?: string | null;
};

export default function OTPModal({
  open,
  onClose,
  onSuccess,
  apiEndpoint,
  pendingToken,
}: OTPModalProps) {
  const [otp, setOtp] = useState("");
  const [serverOtp, setServerOtp] = useState("123456"); // ✅ static OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Jab modal open ho, static OTP set kar do
  useEffect(() => {
    if (open) {
      setServerOtp("123456");
      setLoading(false);
      setOtp("");
      setError("");
      console.log("✅ Static OTP set:", "123456");
    }
  }, [open]);

  const handleVerify = () => {
    if (otp === serverOtp) {
      setError("");
      onSuccess(otp);
    } else {
      setError("❌ The OTP you entered is incorrect. Please try again.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          boxShadow: "0px 12px 40px rgba(0,0,0,0.2)",
          background: "linear-gradient(135deg, #ffffff 0%, #f5f8ff 100%)",
          p: 1,
        },
      }}
    >
      {/* 🌟 Stylish Title */}
      <DialogTitle
        sx={{
          textAlign: "center",
          fontWeight: 700,
          fontSize: "1.8rem",
          color: "#1976d2",
          letterSpacing: "0.5px",
          pb: 0,
        }}
      >
        🔐 Admin OTP Verification
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* 📜 Description */}
          <Typography
            align="center"
            sx={{
              fontSize: "1rem",
              color: "text.secondary",
              px: 2,
              lineHeight: 1.6,
            }}
          >
            Enter the <strong>6-digit OTP</strong> sent to your email to proceed.
            <br />
            (Hint: <strong>123456</strong>)
          </Typography>

          {/* 🎯 Styled OTP Input */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              mt: 1,
            }}
          >
            <TextField
              label="Enter OTP"
              placeholder="e.g. 123456"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
                setError("");
              }}
              fullWidth
              variant="outlined"
              error={!!error}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  fontSize: "1.2rem",
                  letterSpacing: "0.3rem",
                  textAlign: "center",
                  backgroundColor: "#fff",
                  "& fieldset": {
                    borderColor: error ? "#d32f2f" : "#c5d3ff",
                  },
                  "&:hover fieldset": {
                    borderColor: error ? "#d32f2f" : "#1976d2",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: error ? "#d32f2f" : "#1976d2",
                    boxShadow: error
                      ? "0 0 0 3px rgba(211, 47, 47, 0.2)"
                      : "0 0 0 3px rgba(25, 118, 210, 0.15)",
                  },
                },
                input: {
                  textAlign: "center",
                  fontWeight: 600,
                  padding: "14px 0",
                },
              }}
            />
          </Box>

          {/* ⚠️ Inline Error Message */}
          <Fade in={!!error}>
            <Typography
              variant="body2"
              sx={{
                color: "#d32f2f",
                mt: -1,
                fontWeight: 500,
                textAlign: "center",
                minHeight: "20px",
              }}
            >
              {error || " "}
            </Typography>
          </Fade>
        </Stack>
      </DialogContent>

      {/* 🎯 Action Buttons */}
      <DialogActions
        sx={{
          justifyContent: "center",
          pb: 3,
          pt: 1,
          gap: 2,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          size="large"
          sx={{
            borderRadius: 2,
            px: 4,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleVerify}
          variant="contained"
          size="large"
          disabled={!otp}
          sx={{
            borderRadius: 2,
            px: 5,
            textTransform: "none",
            fontWeight: 700,
            boxShadow: "0px 4px 14px rgba(25, 118, 210, 0.4)",
            ":hover": {
              boxShadow: "0px 6px 20px rgba(25, 118, 210, 0.5)",
            },
          }}
        >
          Verify OTP
        </Button>
      </DialogActions>
    </Dialog>
  );
}
