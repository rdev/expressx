/* eslint-disable import/prefer-default-export */
import isDocker from 'is-docker';
import clearTerminal from 'clear';

export function clear() {
	if (!isDocker()) {
		clearTerminal();
	}
}
