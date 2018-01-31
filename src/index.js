import React from 'react';
import ReactDOM from 'react-dom';

import Example from './Example.js';

function render(Component) {
	ReactDOM.render(
		<Component />,
		document.getElementById('root')
	);
};

render(Example);
