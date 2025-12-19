import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Typography, Container, Link, Paper } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Header from "@/ui/dashboard/Header";
import Footer from "@/ui/dashboard/Footer";

const apps = [
  { name: "Safety", link: "/dashboard/safety" },
  { name: "Volume", link: "/dashboard/volume" },
];

export default function ContactPage() {
  const theme = useTheme();

  return (
    <Box
      id="contact-page"
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <Header apps={apps} />

      <Container
        id="contact-content"
        maxWidth="md"
        sx={{ flex: 1, py: 6 }}
      >
        {/* Main Title */}
        <Typography
          variant="h3"
          component="h1"
          id="contact-title"
          sx={{
            color: theme.palette.navy.main,
            fontWeight: "bold",
            mb: 4,
          }}
        >
          Contact Us
        </Typography>

        {/* Contact Card */}
        <Paper
          id="contact-card"
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            backgroundColor: theme.palette.lightgray.light,
            borderRadius: 2,
          }}
        >
          <Typography
            variant="h6"
            component="h2"
            id="contact-subtitle"
            sx={{
              color: theme.palette.navy.main,
              fontWeight: "bold",
              mb: 2,
            }}
          >
            Get in Touch
          </Typography>

          <Typography
            variant="body1"
            id="contact-description"
            sx={{ mb: 3, lineHeight: 1.8 }}
          >
            Have questions about the data? Want to suggest new features or datasets
            to be mapped on the dashboard? We'd love to hear from you.
          </Typography>

          <Typography
            variant="body1"
            id="contact-email-section"
            sx={{ lineHeight: 1.8 }}
          >
            <strong>Email:</strong>{" "}
            <Link
              href="mailto:spatial-admin@ucsb.edu"
              sx={{ color: theme.palette.aqua.main }}
            >
              spatial-admin@ucsb.edu
            </Link>
          </Typography>
        </Paper>

        {/* Additional Info */}
        <Typography
          variant="body1"
          id="contact-additional-info"
          sx={{ mb: 4, lineHeight: 1.8, color: theme.palette.lightgray.contrastText }}
        >
          This dashboard is maintained by the Center for Spatial Science (@Spatial)
          at the University of California, Santa Barbara. Learn more about our work
          on the{" "}
          <Link
            component={RouterLink}
            to="/about"
            sx={{ color: theme.palette.aqua.main }}
          >
            About page
          </Link>
          .
        </Typography>

        {/* Back to Dashboard Link */}
        <Box id="contact-back-link" sx={{ mt: 6 }}>
          <Link
            component={RouterLink}
            to="/dashboard/safety"
            sx={{
              color: theme.palette.aqua.main,
              fontWeight: "medium",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            ← Back to Dashboard
          </Link>
        </Box>
      </Container>

      <Footer />
    </Box>
  );
}

