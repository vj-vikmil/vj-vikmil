<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TekDetek Video Tool

Real-time video processing tool that transforms webcam or video files into generative ASCII art with AI-powered detection.

## Features

- **Real-time ASCII Art Generation** - Convert video feeds to ASCII characters
- **AI Detection** - Object detection, pose estimation, and luma-based detection
- **Customizable Styles** - Multiple ASCII styles and color palettes
- **Video Export** - Record MP4 videos and PNG sequences
- **Node-Based Pipeline** - Visual node graph interface

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Deployment

### Automated Deployment (Recommended)

This project uses GitHub Actions for automated deployment. When you push to `main` or `master`, it automatically:
- Builds the project
- Deploys to GitHub Pages

**Workflows:**
- `.github/workflows/deploy.yml` - Deploys to this repo's GitHub Pages
- `.github/workflows/deploy-to-separate-repo.yml` - Deploys to `vj-vikmil/vj-vikmil` repo

### Manual Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy to target directory:
   ```bash
   npm run deploy
   ```

3. Commit and push to GitHub:
   ```bash
   cd C:\Users\user\Documents\GitHub\vikmil.github.io\vj-vikmil
   git add ascii-detect
   git commit -m "Deploy ascii-detect"
   git push
   ```

**Live Site:** [vikmil.com/ascii-detect/](https://vikmil.com/ascii-detect/)

**Source Code:** [GitHub Repository](https://github.com/vj-vikmil/vj-vikmil/tree/ascii-detect-source)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Third-Party Licenses

This project uses several open-source libraries. See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for complete attribution and license information.

## Author

**Viktors Mileika**

Copyright (c) 2024 Viktors Mileika
