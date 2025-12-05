import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Typography, Link } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function Footer() {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      id="dashboard-footer"
      sx={{
        backgroundColor: theme.palette.white.main,
        borderTop: `1px solid ${theme.palette.lightgray.main}`,
        color: theme.palette.lightgray.contrastText,
        py: 2,
        px: 4,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Typography variant="body2" id="footer-copyright">
        © {new Date().getFullYear()} Center for Spatial Science, UC Santa Barbara
      </Typography>

      <Box
        id="footer-links"
        sx={{ display: "flex", gap: 3 }}
      >
        <Link
          component={RouterLink}
          to="/about"
          id="footer-about-link"
          sx={{
            color: theme.palette.lightgray.contrastText,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          About
        </Link>
        <Link
          component={RouterLink}
          to="/contact"
          id="footer-contact-link"
          sx={{
            color: theme.palette.lightgray.contrastText,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          Contact
        </Link>
      </Box>
    </Box>
  );
}
