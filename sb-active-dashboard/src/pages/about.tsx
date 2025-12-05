import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Typography, Container, Link, Divider } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Header from "@/ui/dashboard/Header";
import Footer from "@/ui/dashboard/Footer";

const apps = [
  { name: "Safety", link: "/dashboard/safety" },
  { name: "Volume", link: "/dashboard/volume" },
];

export default function AboutPage() {
  const theme = useTheme();

  return (
    <Box
      id="about-page"
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <Header apps={apps} />

      <Container
        id="about-content"
        maxWidth="md"
        sx={{ flex: 1, py: 6 }}
      >
        {/* Main Title */}
        <Typography
          variant="h3"
          component="h1"
          id="about-title"
          sx={{
            color: theme.palette.navy.main,
            fontWeight: "bold",
            mb: 4,
          }}
        >
          The Data Dashboard
        </Typography>

        {/* Introduction */}
        <Typography
          variant="body1"
          id="about-intro"
          sx={{ mb: 3, lineHeight: 1.8 }}
        >
          The Active Transportation Data Dashboard was developed through a Regional Early
          Action Planning (REAP) Grant from the State of California to support regional
          planning and data-driven decision-making. This dashboard provides Santa Barbara
          County with a centralized home for spatial data on bicycle and pedestrian safety,
          travel volumes, infrastructure, and equity. It was created to give planners,
          researchers, and community members a tool to better understand and improve active
          transportation across the region.
        </Typography>

        {/* Contact Info */}
        <Typography
          variant="body1"
          id="about-contact-info"
          sx={{ mb: 4, lineHeight: 1.8 }}
        >
          If you have any data questions, or suggestions for what you would like to see
          mapped on the dashboard please contact the team through{" "}
          <Link
            href="mailto:spatial-admin@ucsb.edu"
            sx={{ color: theme.palette.aqua.main }}
          >
            spatial-admin@ucsb.edu
          </Link>
        </Typography>

        {/* @Spatial Info */}
        <Typography
          variant="body1"
          id="about-spatial-info"
          sx={{ mb: 4, lineHeight: 1.8 }}
        >
          The dashboard was created in the Center for Spatial Science (
          <Link
            href="https://spatial.ucsb.edu"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: theme.palette.aqua.main }}
          >
            @Spatial
          </Link>
          ) at the University of California, Santa Barbara. @Spatial we collaboratively
          design, implement, and disseminate spatial science for a better world.
        </Typography>

        <Divider sx={{ my: 4 }} />

        {/* Spatial Center Section */}
        <Typography
          variant="h4"
          component="h2"
          id="spatial-center-title"
          sx={{
            color: theme.palette.navy.main,
            fontWeight: "bold",
            mb: 3,
          }}
        >
          The Spatial Center at UC Santa Barbara
        </Typography>

        <Typography
          variant="body1"
          id="about-leadership"
          sx={{ mb: 3, lineHeight: 1.8 }}
        >
          Led by Director Dr. Trisalyn Nelson, Associate Directors Dr. Somayeh Dodge and
          Dr. Peter Kedron, @Spatial drives cutting-edge research and innovation through
          speaker series, workshops, visiting scholars, and collaborative meetings.
        </Typography>

        <Typography
          variant="body1"
          id="about-work"
          sx={{ mb: 4, lineHeight: 1.8 }}
        >
          Our work includes a collaboration with Esri to develop a GIScience curriculum
          for the modern era, the{" "}
          <Link
            href="https://www.esri.com/en-us/arcgis/products/arcgis-learn/overview"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: theme.palette.aqua.main }}
          >
            Guide to the Geographic Approach
          </Link>
          . Through our GIS and Earth Observing Services (GEOS) Center, we also provide
          geospatial services and expertise to support academic and non-academic clients
          across fields such as spatial analysis, GIScience, transportation systems,
          remote sensing, urban and regional science, wildfire, and habitat restoration
          monitoring.
        </Typography>

        {/* Back to Dashboard Link */}
        <Box id="about-back-link" sx={{ mt: 6 }}>
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
