# Testing & Verification Guide

## 1. Automated Unit & Integration Tests

The test suite covers:
- **Graph Traversal & Pathfinding**: BFS shortest paths, Dijkstra optimal affinity routing, handling of disconnected nodes and cycle detection.
- **Modular Similarity Engine**: Jaccard index on genres, relationship weighting, missing signal normalization, edge score calculation.
- **TasteDNA Analysis**: Library diversity index calculation (Simpson's reciprocal metric), bridge artist detection across multiple clusters, dominant genre distributions.
- **Database Backup & Restore Validation**: Schema validation, corrupted payload rejection, version checking.

### Running Tests

```bash
npm test
```

## 2. Interactive Browser Verification Checklist

Verify in your browser at `http://localhost:3000`:

1. **SoundGalaxy (3D Universe)**:
   - Rotate, pan, and zoom via mouse/touch controls.
   - Click any artist star to open the contextual detail panel.
   - Click a planet orbiting the star to see track information.
   - Click a cluster label to center the camera on the cluster.
   - Press `/` to search and immediately navigate to any artist or track.
   - Click "Recenter" in the top bar to return camera to origin.
2. **TasteDNA**:
   - Inspect cluster cards with accurate percentages and artist counts.
   - Review Simpson's diversity score.
   - Click "Navigate Universe to this Cluster" to travel directly to the corresponding 3D region.
   - Inspect Galactic Bridge Artists and verified discovery suggestions.
3. **Cosmic Journey**:
   - Select departure and destination stars.
   - Observe real-time Dijkstra path traversal across verified edges.
   - Step through each waypoint and review connection explanations.
   - Save the journey to the library with a custom title.
4. **Synesthesia (Audio-Reactive Visuals)**:
   - Click "Cosmic Synth" to generate rich real-time procedural chords via the Web Audio API.
   - Toggle through all three presets (*Cosmic Pulse*, *Nebula Flow*, *Stellar Geometry*).
   - Adjust sensitivity and particle density sliders and observe real-time visual reaction.
   - Click "Record Visual" to capture canvas video/audio into a `.webm` file and download it.
5. **Library**:
   - Verify saved journeys appear with hop counts and timestamps.
   - Click "Replay Journey" to smoothly animate the path in SoundGalaxy.
   - Export backup JSON and test importing valid/invalid files.
6. **Settings & Accessibility**:
   - Toggle "Reduced Motion" and verify scene disables ambient drift.
   - Toggle "Alternative 2D Catalog Mode" and verify graceful fallback to the structured 2D topological explorer.

