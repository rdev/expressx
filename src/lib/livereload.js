import livereload from 'livereload';

const lr = livereload.createServer();

export default function refresh() {
	lr.refresh('');
}
