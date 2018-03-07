import livereload from 'livereload';

const lr = livereload.createServer();

// Trigger livereload
export default function refresh() {
	lr.refresh('');
}
