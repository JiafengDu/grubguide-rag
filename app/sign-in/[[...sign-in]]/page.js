"use client";
import { SignIn } from "@clerk/nextjs";
import {
  AppBar,
  Button,
  Container,
  Toolbar,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import Link from "next/link";
import { createTheme, ThemeProvider } from "@mui/material/styles";

export default function SignInPage() {
  const theme = createTheme({
    palette: {
      primary: {
        main: "#13294B", // Primary color
      },
      secondary: {
        main: "#ff5f05", // Secondary color
      },
      background: {
        default: "#F4F6F8", // Background color
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="100vw">
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1, cursor: "pointer" }}>
              Where Should I Eat? (Urbana-Champaign Edition)
            </Typography>
            <Button variant="contained" color="secondary" href="/">
              Home
            </Button>
          </Toolbar>
        </AppBar>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="100vh"
          bgcolor="background.default"
        >
          <Stack spacing={4} alignItems="center">
            <Typography variant="h4" gutterBottom>
              Sign In
            </Typography>
            <SignIn />
            
          </Stack>
        </Box>
      </Container>
    </ThemeProvider>
  );
}
