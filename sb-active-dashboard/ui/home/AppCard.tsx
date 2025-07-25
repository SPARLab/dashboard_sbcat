"use client";
import React from "react";
import { Link as RouterLink } from "react-router-dom";

import {
  Box,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  CardActions,
  Button,
  Typography,
  Link,
} from "@mui/material";

interface Props {
  title: string;
  summary: string;
  image: string;
  link: string;
}

export default function AppCard(props: Props) {
  const { title, summary, image, link } = props;

  return (
    <Card
      sx={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        width: "fit-content",
        maxWidth: "100%",
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={link}
        sx={{
          flex: "1 1 350px",
          minwidth: 151,
          maxWidth: 550,
          minWidth: "350px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <CardMedia
          component="img"
          image={image}
          alt="descriptive image for app"
          sx={{ justifyContent: "center" }}
        />
      </CardActionArea>

      <Box
        sx={{
          flex: "1 2 350px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "end",
          minHeight: "350px",
          maxWidth: 550,
          minWidth: "350px",
        }}
      >
        <CardContent sx={{ flex: "1 0 auto" }}>
          <Typography component="div" variant="h5" sx={{ my: 2 }}>
            {title}
          </Typography>
          <Typography
            variant="subtitle1"
            component="div"
            sx={{ color: "text.secondary" }}
          >
            {summary}
          </Typography>
        </CardContent>

        <CardActions>
          <Link component={RouterLink} to={link} underline="hover" p={2}>
            Launch app
          </Link>

        </CardActions>
      </Box>
    </Card>
  );
}
