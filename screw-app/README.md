# Screw App

A web-based application to play back MP3s with independently altered pitch and tempo, right in your web browser.

This is a recreation of [dumbmatter's Screw](https://github.com/dumbmatter/screw) as a proof of concept.

## Features

- Load and play MP3 files in the browser
- Adjust pitch independently of tempo
- Adjust tempo independently of pitch
- Simple, intuitive controls

## How It Works

This application uses the Web Audio API along with the SoundTouch library to process audio in real-time. The SoundTouch library provides algorithms for time-stretching and pitch-shifting audio.

## Building and Running

### Prerequisites

- Node.js and npm

### Installation

1. Install dependencies:

```
npm install
```

2. Build the application:

```
npm run build
```

3. Start the development server:

```
npm start
```

4. Open your browser and navigate to `http://localhost:8080`

## Development

For development with auto-rebuilding, use:

```
npm run watch
```

## Credits

Based on the original [Screw](https://github.com/dumbmatter/screw) by Jeremy Scheff. 