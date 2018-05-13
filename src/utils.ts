/**
 * Development utility function for throwing that
 * something has not yet been implemented.
 *
 * @param args Any arguments that will be swallowed up
 */
export const notImplemented = (...args: any[]) => {
	throw new Error('Not Implemented');
};
