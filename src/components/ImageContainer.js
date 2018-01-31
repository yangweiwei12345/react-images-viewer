import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import raf from 'raf';
import tween from './tween.js';
import Loading from './Loading';

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function setScope(value, min, max) {
	if(value < min) {
		return min;
	}
	if(value > max) {
		return max;
	}

	return value;
}

const msPerFrame = 1000 / 60;
const maxAnimateTime = 1000;

/**
 * 图片默认模式：宽度等于屏幕宽度，高度等比缩放；水平居中，垂直居中或者居顶（当高度大于屏幕高度时）
 * 图片实际尺寸： actualWidth, actualHeight
 * 图片初始尺寸：originWidth, originHeight
 * 坐标位置: left, top
 * 放大倍数：zoom
 * 最大放大倍数： maxZoomNum
 * 坐标关系: -(maxZoomNum - 1) * originWidth / 2 < left < 0
 		    -(maxZoomNum - 1) * originHeight / 2 < top < 0
 * 尺寸关系: width = zoom * originWidth
 			height = zoom * originHeight
 * 放大点位置关系：
 * 初始点位置：oldPointLeft, oldPointTop
 * 放大点位置：newPointLeft, newPointTop
 * 对应关系：  newPointLeft = zoom * oldPointLeft
 			  newPointTop = zoom * oldPointTop

 * 坐标位置：left = startLeft + (newPointLeft - oldPointLeft) = (zoom - 1) * oldPointLeft
 			top = startTop + (newPointTop - oldPointTop) = (zoom - 1) * oldPointTop
 */

class ImageContainer extends PureComponent {
	static propTypes = {
		maxZoomNum: PropTypes.number.isRequired,
		handleStart: PropTypes.func,
		handleMove: PropTypes.func,
		handleEnd: PropTypes.func
	}

	static contextTypes = {
		onClose: PropTypes.func
	}

	state = {
		width: 0,
		height: 0,
		left: 0,
		top: 0,
		isLoading: false,
		isLoaded: false
	}

	constructor() {
		super();

		this.actualWidth = 0;		//图片实际宽度
		this.actualHeight = 0;		//图片实际高度

		this.originWidth = 0;		//图片默认展示模式下宽度
		this.originHeight = 0;		//图片默认展示模式下高度

		this.startHeight = 0;		//开始触摸操作时图片高度
		this.startWidth = 0;		//开始触摸操作时图片宽度
		this.startLeft = 0;			//开始触摸操作时left值
		this.startTop = 0;			//开始触摸操作时top 值

		this.onTouchStartTime = 0;	//单指触摸开始时间
		this.isTap = false;			//是否为tap事件

		this.isTwoFingeMode = false;	//是否为双指模式
		this.oldPointLeft = 0;			//计算手指中间点到图片上的位置(坐标值)
		this.oldPointTop = 0;			//计算手指中间点到图片上的位置
		this._touchZoomDistanceStart = 0;	//用于记录双指距离

		this.animationID = 0;
		this.animateStartTime = 0;
		this.animateStartValue = {
			x: 0,
			y: 0
		};
		this.animateFinalValue = {
			x: 0,
			y: 0
		};

	}

	componentWillMount() {
		this.loadImg(this.props.src);
	}

	componentWillUnmount() {
		this.unloadImg();
		if(this.animationID) {
			raf.cancel(this.animationID);
		}
	}

	handleTouchStart = (event) => {
		console.info('handleTouchStart');
		event.preventDefault();
		if(this.animationID) {
			raf.cancel(this.animationID);
		}

		switch(event.touches.length) {
			case 1:
				let targetEvent = event.touches[0];
				this.startX = targetEvent.clientX;
				this.startY = targetEvent.clientY;

				this.startLeft = this.state.left;
				this.startTop = this.state.top;

				this.onTouchStartTime = (new Date()).getTime();
				this.isTap = true;
				break;
			case 2:
				//设置双指模式
				this.isTwoFingeMode = true;

				//计算两个手指中间点屏幕上的坐标
				const middlePointClientLeft = Math.abs(Math.round((event.touches[0].clientX + event.touches[1].clientX) / 2));
				const middlePointClientTop = Math.abs(Math.round((event.touches[0].clientY + event.touches[1].clientY) / 2));

				//保存图片初始位置的尺寸
				this.startLeft = this.state.left;
				this.startTop = this.state.top;
				this.startWidth = this.state.width;
				this.startHeight = this.state.height;

				//计算手指中间点在图片上的位置
				this.oldPointLeft = middlePointClientLeft - this.startLeft;
				this.oldPointTop = middlePointClientTop - this.startTop;

				//计算两指间距离
				var dx = event.touches[0].clientX - event.touches[1].clientX;
				var dy = event.touches[0].clientY - event.touches[1].clientY;
				this._touchZoomDistanceStart = this._touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );
				break;
			default:
				break;
		}
	}

	handleTouchMove = (event) => {
		event.preventDefault();

		switch (event.touches.length) {
			case 1:
				//计算单指滑动的距离
				let targetEvent = event.touches[0],
					diffX = targetEvent.clientX - this.startX,
					diffY = targetEvent.clientY - this.startY;

				this.diffX = diffX;
				this.diffY = diffY;

				//判断是否移动，如果没有移动就是点击，关闭预览
				if(Math.abs(diffX) > 5 || Math.abs(diffY) > 5){
					this.isTap = false;
				}

				//图片宽度等于初始宽度，直接调用handleMove函数
				if(this.state.width === this.originWidth) {
					if(this.props.handleMove) {
						this.callHandleMove(diffX);
					}
				}
				else
				{
					this.setState((prevState, props) => {
						let top = (props.screenHeight - prevState.height) / 2,
							left = this.startLeft = diffX;

						if(prevState.height > props.screenHeight) {
							top = setScope(this.startTop + diffX, ( props.screenHeight - prevState.height ), 0);
						}
						console.info("left = %s, this.originWidth - prevState.width = %s", left, this.originWidth - prevState.width);

						//
						if(props.handleMove) {
							if(left < this.originWidth - prevState.width) {
								this.callHandleMove(left + prevState.width - this.originWidth);
							}
							else if(left > 0) {
								this.callHandleMove(left);
							}
						}

						left = setScope(left, this.originWidth - prevState.width, 0);

						return {
							left,
							 top
						};
					});
				}

				break;
			case 2:
				var dx = event.touches[0].clientX - event.touches[1].clientX;
				var dy = event.touches[0].clientY - event.touches[1].clientY;

				this._touchZoomDistanceEnd = Math.sqrt(dx * dx + dy * dy);

				let zoom = Math.sqrt(this._touchZoomDistanceEnd / this._touchZoomDistanceStart);

				this.setState((prevState, props) => {
					let left = this.startLeft + (1 - zoom) * this._oldPointLeft,
						top = this.startTop + (1 - zoom) * this._oldPointTop,
						width = zoom * this.startWidth,
						height = zoom * this.startHeight;

					console.info("zoom = %s, left = %s, top = %s, width = %s, height = %s ",zoom, left, top, width, height);
					return {
						left, 
						top,
						width,
						height
					}
				});
				break;
			default:
				break;
		}
	}

	handleTouchEnd = (event) => {
		event.preventDefault();

		if(this.isTwoFingeMode) {		//双指操作结束
			let touchLen = event.touches.length;
			this.isTwoFingeMode = false;

			if(touchLen === 1) {
				let targetEvent = event.touches[0];

				this.startX = targetEvent.clientX;
				this.startY = targetEvent.clientY;
			}

			this.setState((prevState, props) => {
				let left, top, width, height, zoom;

				width = setScope(prevState.width, this.originWidth, props.maxZoomNum * this.originWidth);
				height = setScope(prevState.height, this.originHeight, props.maxZoomNum * this.originHeight);

				zoom = width / this.startWidth;
				left = setScope(this.startLeft + ( 1 - zoom ) * this.oldPointLeft, this.originWidth - width, 0);

				if(height > props.screenHeight) {
					top = setScope(this.startTop + ( 1 - zoom ) * this.oldPointTop, props.screenHeight - height, 0);
				} else {
					top = (props.screenHeight - height) / 2;
				}

				if(touchLen === 1) {
					this.startLeft = left;
					this.startTop = top;

				}

				return {
					width,
					height,
					left,
					top
				};

			});

		} else {
			let diffTime = (new Date()).getTime() - this.onTouchStartTime,
				diffx = this.diffX,
				diffy = this.diffY;

				if(diffTime < 100 && this.isTap) {
					this.context.onClose();
				} else {
					this.callHandleEnd(diffy < 30);

					if(diffTime < maxAnimateTime / 2) {
						let x, y;

						//使用相同的速度算法
						x = diffx * maxAnimateTime / diffTime + this.startLeft;
						y = diffy * maxAnimateTime / diffTime + this.startTop;

						x = setScope(x, this.originWidth - this.state.width, 0);

						if(this.state.height > this.props.screenHeight) {
							y = setScope(y, this.props.screenHeight - this.state.height, 0);
						} else {
							y = this.state.top;
						}
						console.info("this.state.height = %s, screenHeight = %s,",this.state.height,this.props.screenHeight);
          				console.info("diffTime=%s, diffx = %s, diffy = %s, startLeft = %s, startTop=%s, x = %s, y = %s",diffTime,diffx,diffy, this.startLeft, this.startTop,x, y);

          				this.animateStartValue = {
          					x: this.state.left,
          					y: this.state.top
          				};

          				this.animateFinalValue = {
          					x,
          					y
          				};

          				this.animateStartTime = Date.now();
          				this.startAnimte();
					}
				}

		}
	}

	startAnimte = () => {
		this.animationID = raf(() => {
			let curTime = Date.now() - this.animateStartTime;
			let left, top;

			if(curTime > maxAnimateTime) {
				this.setState((prevState, props) => {
					left = setScope(prevState.left, this.originWidth - prevState.width, 0);

					if(prevState.height > props.screenHeight) {
						top = setScope(prevState.top, props.screenHeight - prevState.height, 0);
					} else {
						top = (props.screenHeight - prevState.height) / 2;
					}

					return {
						left, 
						top
					};
				});
			}
			else
			{
				left = tween.easeOutQuart(curTime, this.animateStartValue.x, this.animateFinalValue.x, maxAnimateTime);
				top = tween.easeOutQuart(curTime, this.animateStartValue.y, this.animateFinalValue.y, maxAnimateTime);

				this.setState({
					left,
					top
				});

				this.startAnimte();
			}
		});
	}

	callHandleMove = (diffX) => {
		if(!this.isCalledHandleStart) {
			this.isCalledHandleStart = true;
			if(this.props.handleStart) {
				this.props.handleStart();
			}
		}

		this.props.handleMove(diffX);
	}

	callHandleEnd = (isAllowChange) =>{
	    if(this.isCalledHandleStart){
	      	this.isCalledHandleStart = false;
	      	if(this.props.handleEnd){
	        	this.props.handleEnd(isAllowChange);
	      	}
	    }
	}

	onLoad = () => {
		this.actualWidth = this.img.width;
		this.actualHeight = this.img.height;

		const {
			screenWidth,
			screenHeight
		} = this.props;

		let left = 0, top = 0;

		this.originWidth = screenWidth;
		this.originHeight = this.actualHeight / this.actualWidth * screenWidth;

		if(this.actualHeight / this.actualWidth < screenHeight / screenWidth) {
			top = parseInt((screenHeight - this.originHeight) / 2);
		}
		this.originTop = top;

		this.setState({
			width: this.originWidth,
			height: this.originHeight,
			left,
			top,
			isLoading: false,
			isLoaded: true
		});
	}

	onError = () => {
		this.setState({
			isLoading: false,
			isLoaded: true
		});
	}

	loadImg = (url) => {
		this.img = new Image();
		this.img.src = url;
		this.img.onload = this.onLoad;
		this.img.onerror = this.onError;

		this.setState({
			isLoading: true,
			isLoaded: false
		});
	}

	unloadImg = () => {
		delete this.img.onerror;
		delete this.img.onload;
		delete this.img.src;
		delete this.img
	}

	render() {
		const {
			screenWidth,
			screenHeight,
			src,
			left
		} = this.props;

		const {
			isLoading,
			isLoaded,
			...ImageStyle
		} = this.state;

		let defaultStyle = {
			left: left,
			width: screenWidth,
			height: screenHeight
		}

		return (
			<div
				className="viewer-image-container"
				onTouchStart={this.handleTouchStart}
				onTouchMove={this.handleTouchMove}
				onTouchEnd={this.handleTouchEnd}
				style={defaultStyle}
			>
			{
				isLoaded ? <img src={src} style={ImageStyle} /> : <Loading />
			}
			
			</div>
		)
	}
}

export default ImageContainer;


















