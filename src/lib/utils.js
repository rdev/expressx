/* eslint-disable import/prefer-default-export */
import isDocker from 'is-docker';

export function clear() {
	if (!isDocker()) {
		console.clear();
	}
}
