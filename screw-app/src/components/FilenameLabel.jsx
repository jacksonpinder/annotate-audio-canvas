const React = require('react');

function FilenameLabel({error, filename}) {
    let text = 'No file selected';
    let className = 'text-muted';
    if (filename !== undefined) {
        text = filename;
        className = error !== undefined ? 'text-danger' : 'text-primary';
    }

    return (
        <span className={className}>
            {text}
        </span>
    );
}

FilenameLabel.propTypes = {
    error: React.PropTypes.shape({
        message: React.PropTypes.string.isRequired,
        type: React.PropTypes.string.isRequired,
    }),
    filename: React.PropTypes.string,
};

module.exports = FilenameLabel; 