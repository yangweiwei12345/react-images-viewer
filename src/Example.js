import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import ReactImagesViewer from './components/ReactImagesViewer';

class Example extends Component {

	constructor(props) {
	  	super(props);

	  	this.state = {
	  		images: [
			  	require('./assets/2.jpg'),
			  	require('./assets/1.jpg'),
			  	require('./assets/0.jpg'),
			  	require('./assets/3.jpg'),
			  	require('./assets/4.jpg'),
			],
			index: 0,
			isOpen: false
	  	};
	}

  	onClose = () => {
		this.setState({
		  	isOpen: false
		})
	}

	openViewer (index){
		this.setState({
		  	index,
		  	isOpen: true
		})
	}

	render() {
		const {
		  	imags,
		  	index,
		  	isOpen
		} = this.state;

		return (
			<div className="app">
				<div className="img-list">
					<button onClick={this.openViewer.bind(this, 0)} >点击打开图片</button>
					{
						this.state.images.map((item, index) => {
							return <div className="img" key={index}>
								<img src={item} alt="" onClick={this.openViewer.bind(this, index)} urls={this.state.images} width="100%" height="auto" className="" />
							</div>
						})
					}
				</div>
				{
					isOpen ? <ReactImagesViewer onClose={this.onClose} urls={this.state.images} index={index} /> : ""
				}
			</div>

		)
	}
}

export default Example;