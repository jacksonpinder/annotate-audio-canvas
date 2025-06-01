const React = require('react');

function TrackControls({action, error, filename, onPause, onPlay, onStop}) {
    const disabled = !filename || error;

    return (
        <div className="btn-group">
            <button
                type="button"
                className={`btn ${action === 'play' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={onPlay}
                disabled={disabled}
            >
                <span className="octicon octicon-playback-play" />
            </button>
            <button
                type="button"
                className={`btn ${action === 'pause' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={onPause}
                disabled={disabled}
            >
                <span className="octicon octicon-playback-pause" />
            </button>
            <button
                type="button"
                className={`btn ${action === 'stop' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={onStop}
                disabled={disabled}
            >
                <span className="octicon octicon-primitive-square" />
            </button>
        </div>
    );
}

TrackControls.propTypes = {
    action: React.PropTypes.oneOf(['play', 'pause', 'stop']),
    error: React.PropTypes.shape({
        message: React.PropTypes.string.isRequired,
        type: React.PropTypes.string.isRequired,
    }),
    filename: React.PropTypes.string,
    onPause: React.PropTypes.func.isRequired,
    onPlay: React.PropTypes.func.isRequired,
    onStop: React.PropTypes.func.isRequired,
};

module.exports = TrackControls; 