import { Component } from 'react';

export default class BlogAdminErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Blog Manager failed to render', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-surface p-6">
          <h1 className="page-title">Blog Manager could not load</h1>
          <p className="mt-3 text-sm text-red-700">{this.state.error.message || 'Unknown rendering error.'}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
