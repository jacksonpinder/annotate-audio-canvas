const React = require('react');

function ErrorAlert({error}) {
    if (!error) {
        return null;
    }

    return (
        <div className="alert alert-danger" role="alert">
            <strong>{error.type}:</strong> {error.message}
        </div>
    );
}

ErrorAlert.propTypes = {
    error: React.PropTypes.shape({
        message: React.PropTypes.string.isRequired,
        type: React.PropTypes.string.isRequired,
    }),
};

module.exports = ErrorAlert; 