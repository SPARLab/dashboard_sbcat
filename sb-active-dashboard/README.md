# Santa Barbara Active Transportation Dashboard

A comprehensive web-based GIS dashboard for analyzing bicycle and pedestrian traffic volumes, safety incidents, and transportation patterns in Santa Barbara County.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (with TypeScript checking) |
| `npm run build:deploy` | Build for deployment (optimized) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on codebase |
| `npm test` | Run unit tests with Vitest |
| `npm run test:ui` | Run tests with UI interface |
| `npm run test:coverage` | Generate test coverage report |
| `npm run test:watch` | Run tests in watch mode |
| `npm run e2e` | Run end-to-end tests with Playwright |
| `npm run e2e:ui` | Run E2E tests with UI |
| `npm run deploy` | Deploy to GitHub Pages |

## 🛠️ Tech Stack

### Core
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing

### Mapping & GIS
- **ArcGIS API for JavaScript 4.33** - Core mapping engine
- **ArcGIS Map Components** - React map components
- **Calcite Components** - Esri design system

### UI & Styling
- **Material-UI (MUI)** - Component library
- **Emotion** - CSS-in-JS styling
- **Tailwind CSS** - Utility-first CSS

### Data Visualization
- **ECharts** - Interactive charts
- **Chart.js** - Additional charting

### State Management
- **Zustand** - Lightweight state management

### Testing
- **Vitest** - Unit testing framework
- **Testing Library** - React component testing
- **Playwright** - E2E testing
- **MSW** - API mocking

## 📁 Project Structure

```
sb-active-dashboard/
├── src/                    # Application entry point
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # React entry point
│   └── pages/             # Page components
├── ui/                     # UI components
│   ├── components/        # Shared components
│   ├── dashboard/         # Dashboard layout
│   ├── volume-app/        # Volume analysis features
│   ├── safety-app/        # Safety analysis features
│   └── explore-app/       # Data exploration features
├── lib/                    # Business logic
│   ├── data-services/     # High-level data services
│   ├── utilities/         # Domain-specific utilities
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand state stores
│   ├── volume-app/        # Volume-specific logic
│   └── safety-app/        # Safety-specific logic
├── docs/                   # 📚 Documentation
├── public/                 # Static assets
├── e2e/                    # End-to-end tests
└── scripts/               # Utility scripts
```

## 🎯 Core Features

### Volume Analysis
- **Count Site Data** - Display and analyze bicycle/pedestrian count sites
- **AADT Calculations** - Enhanced Average Annual Daily Traffic estimates
- **Modeled Volumes** - Predicted traffic volumes using multiple models
- **Year-over-Year Comparison** - Track traffic trends over time
- **Interactive Histograms** - Visualize volume distributions

### Safety Analysis
- **Incident Mapping** - Display collisions, near-misses, and hazards
- **Spatial Queries** - Analyze incidents within selected areas
- **Heatmap Visualization** - Identify high-risk corridors
- **Filter & Analysis** - Filter by severity, type, e-bike involvement

### Interactive Mapping
- **Geographic Boundaries** - Cities, census tracts, service areas, school districts
- **Custom Area Selection** - Draw polygons to analyze custom areas
- **Layer Management** - Toggle visibility of different data layers
- **Dynamic Rendering** - Adaptive rendering based on zoom level

## 📚 Documentation

Detailed technical documentation is available in the [`docs/`](./docs) folder:

### Core Documentation
- [**Architecture: Utilities & Data Services**](./docs/ARCHITECTURE_UTILITIES.md) - System architecture and data service patterns
- [**AADT Cache Implementation**](./docs/AADT_CACHE_IMPLEMENTATION.md) - Count site data caching strategy
- [**Feature Flags**](./docs/FEATURE_FLAGS.md) - Available feature toggles and configuration
- [**Overlapping Polygon Solutions**](./docs/OVERLAPPING_POLYGON_SOLUTIONS.md) - Handle overlapping geographic boundaries
- [**Testing Setup**](./docs/TESTING_SETUP.md) - Test infrastructure (Vitest, Playwright, MSW)

### Historical Documentation
Historical and legacy documentation is preserved in [`docs/archive/`](./docs/archive) for reference.

## 🔧 Environment Variables

Create a `.env` file in the project root:

```bash
# Feature Flags
VITE_SHOW_STRAVA_BIAS_CORRECTION=false
VITE_SHOW_ALL_CA_CITIES=false
VITE_SHOW_ALL_CA_SERVICE_AREAS=false

# Add other configuration as needed
```

See [Feature Flags Documentation](./docs/FEATURE_FLAGS.md) for details.

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Generate coverage
npm run test:coverage
```

### End-to-End Tests
```bash
# Run E2E tests
npm run e2e

# Run with UI
npm run e2e:ui

# Run in headed mode (see browser)
npm run e2e:headed
```

## 🏗️ Development

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Open http://localhost:5173

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Vitest for unit testing
- Playwright for E2E testing

## 🚢 Deployment

```bash
# Build and deploy to GitHub Pages
npm run deploy
```

The build process:
1. Runs TypeScript compiler
2. Bundles with Vite
3. Optimizes assets
4. Deploys to `gh-pages` branch

## 📝 License

Private project - Santa Barbara Active Transportation Dashboard

## 🤝 Contributing

This is a research project. For questions or contributions, please contact the project maintainers.

---

**Built with ❤️ for active transportation planning in Santa Barbara County**
