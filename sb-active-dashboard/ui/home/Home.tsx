"use client";

import React from "react";
import { Container, Typography, Toolbar, Box } from "@mui/material";
import Grid from "@mui/material/Grid";
import AppCard from "./AppCard";
import allApps from "./appInfo.json";
import { appTheme } from "../theme";
import { featureFlags } from "@/src/config/featureFlags";

const apps = featureFlags.showVolumePage
  ? allApps
  : allApps.filter((app) => app.title !== "Volume");

export default function HomePage() {
  return (
    <Container maxWidth="xl">
      <Box
        sx={{
          py: 2,
          my: 3,
          display: "block",
          width: "100%",
          borderBottom: `4px solid ${appTheme.palette.coral.dark} `,
        }}
      >
        <Typography
          variant="h4"
          sx={{ color: "navy.main", fontWeight: "bold" }}
        >
          Active SB
        </Typography>
        <Typography variant="body1" sx={{ color: "navy.main" }}>
          Santa Barbara County Active Transportation Data Dashboard
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Welcome!
        </Typography>

        <Typography variant="body1">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc euismod,
          felis id tincidunt eleifend, elit nulla facilisis sapien, ac dictum
          ligula lorem nec nulla. Sed suscipit, quam ac tincidunt interdum, orci
          felis elementum sapien, id tempus massa orci in libero. Curabitur
          malesuada, nisi eget ultricies tincidunt, odio sapien fringilla
          lectus, ut tincidunt nisl est ut est. Vestibulum venenatis diam a
          libero malesuada, a efficitur purus gravida. Aenean consectetur,
          sapien ut facilisis dictum, ex nunc consequat urna, at auctor velit
          turpis et ligula.
          <br />
          Suspendisse potenti. Donec venenatis, odio eget varius ullamcorper,
          nisl orci sagittis turpis, nec gravida augue lectus nec purus. Fusce
          at nulla in purus volutpat malesuada eget eu purus. Nam tincidunt
          velit nec libero bibendum, sit amet dignissim eros venenatis. Integer
          facilisis sapien non augue pharetra, vel dapibus odio fermentum. Cras
          sodales, erat id vehicula tristique, libero tortor tincidunt justo,
          vel tincidunt risus risus nec velit. Phasellus interdum laoreet justo,
          et condimentum lorem suscipit a.
        </Typography>
      </Box>

      <Box my={3}>
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Check out our applications:
        </Typography>
        <Grid container my={3} spacing={2} sx={{ justifyContent: "center" }}>
          {apps?.map((app) => (
            <Grid key={app.title} size={{ xs: 12, md: 6, lg: 4, xl: 3 }}>
              <AppCard
                title={app.title}
                summary={app.summary}
                image={app.image}
                link={app.link}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
}
