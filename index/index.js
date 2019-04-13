const HANDLE_SIZE = 20; //触点长度
const HANDLE_OFFECT_MOVE = 20; //触点触发增加值 ， 触点可触发坐标 = HANDLE_SIZE + HANDLE_OFFECT_MOVE
const CANVAS_DIFF_SIZE = 40; //canvas宽高跟圆弧直径差值
const CIRCLE_BORDER_WIDTH = 4; //元素#circleWrapper 外圆边框宽度

Page({

  data: {
    size: { min: 0, max: 100 }, //圆弧选择数值范围
    value: { handle1: 0, handle2: 30 }, //触点起止值
    canvasDiffSize: CANVAS_DIFF_SIZE, //canvas宽高跟圆弧直径差值
    position: { //触点坐标
      handle1: { left: 141, top: 152 },
      handle2: { left: 86, top: 0 }
    },
    circleWrapper: {}, //容器元素信息
  },

  canvasIdErrorCallback(e) {
    console.error(e.detail.errMsg)
  },

  onLoad() {
    // 获取外边圆元素信息
    wx.createSelectorQuery().in(this).select('#circleWrapper').boundingClientRect((res) => {
      this.setData({ circleWrapper: res });
      this.updateWidget();
    }).exec();
  },

  updateWidget() { //根据数值计算触点位移
    const radius = this.data.circleWrapper.width / 2 - CIRCLE_BORDER_WIDTH / 2; //半径=圆的宽度/2 - 圆的边框长度/2
    const minValue = this.data.size.min || 0; //最小值
    const maxValue = this.data.size.max || 360; //最大值
    const steps = maxValue - minValue;
    const stepSize = 360 / steps;  //角度与数值的比例
    const value = this.data.value;
    // 计算两个触点的偏移
    const deg1 = value.handle1 * stepSize;
    const left1 = Math.round(radius + radius * Math.sin(deg1 * Math.PI / 180)) - HANDLE_SIZE / 2;
    const top1 = Math.round(radius + radius * -Math.cos(deg1 * Math.PI / 180)) - HANDLE_SIZE / 2;
    const deg2 = value.handle2 * stepSize;
    const left2 = Math.round(radius + radius * Math.sin(deg2 * Math.PI / 180)) - HANDLE_SIZE / 2;
    const top2 = Math.round(radius + radius * -Math.cos(deg2 * Math.PI / 180)) - HANDLE_SIZE / 2;
    this.drawCircle(deg1, deg2, left1, top1, left2, top2); //绘制canvas
  },

  drawCircle(degreeStart = 0, degreeEnd = 0, left1 = 0, top1 = 0, left2 = 0, top2 = 0) { //绘画圆弧

    const canvasDiffSize = this.data.canvasDiffSize;
    const canvasOffect = canvasDiffSize / 2; //实际绘画圆弧的偏移
    const borderWidth = CIRCLE_BORDER_WIDTH; //边宽
    const circleWrapper = this.data.circleWrapper; //容器信息
    const radius = circleWrapper.width / 2; //半径
    const canvasSize = circleWrapper.width + canvasDiffSize; //canvas宽高比圆弧直径大canvasDiffSize像素
    this.setData({ canvasSize });

    const context = wx.createCanvasContext('canvas')
    context.setLineDash([1, 10], 5) //虚线
    context.setLineCap('round')
    context.setStrokeStyle('#feba46')
    context.setLineWidth(CIRCLE_BORDER_WIDTH)
    context.arc( //绘画圆弧
      radius + canvasOffect,
      radius + canvasOffect,
      radius - borderWidth / 2,
      this.degreesToRadians(degreeStart) - Math.PI / 2,
      this.degreesToRadians(degreeEnd) - Math.PI / 2,
      false);
    context.stroke();

    // 触点偏移 = 位移 + canvas与圆的差值/2 + 圆的边框长度/2 + 触点半径
    context.beginPath();
    context.arc(
      left1 + canvasOffect + CIRCLE_BORDER_WIDTH / 2 + HANDLE_SIZE / 2,
      top1 + canvasOffect + CIRCLE_BORDER_WIDTH / 2 + HANDLE_SIZE / 2,
      HANDLE_SIZE / 2, 0, 360)
    context.setFillStyle('#000000')
    context.fill();

    context.beginPath();
    context.arc(
      left2 + canvasOffect + CIRCLE_BORDER_WIDTH / 2 + HANDLE_SIZE / 2,
      top2 + canvasOffect + CIRCLE_BORDER_WIDTH / 2 + HANDLE_SIZE / 2,
      HANDLE_SIZE / 2, 0, 360)
    context.setFillStyle('#000000')
    context.fill();
    context.draw();

    // 保存触点坐标
    const position = this.data.position;
    position.handle1.left = left1 + canvasOffect;
    position.handle1.top = top1 + canvasOffect;
    position.handle2.left = left2 + canvasOffect;
    position.handle2.top = top2 + canvasOffect;
    this.setData({ position });
  },

  degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  },

  bindtouchstart(e) { //开始滑动, 获取触点元素
    const position = this.data.position;
    const { x, y } = e.changedTouches[0];
    const handle1 = position.handle1;
    const handle2 = position.handle2;
    let curHandle = null;
    if (
      handle1.left + HANDLE_SIZE + HANDLE_OFFECT_MOVE > x
      && handle1.left - HANDLE_OFFECT_MOVE < x
      && handle1.top + HANDLE_SIZE + HANDLE_OFFECT_MOVE > y
      && handle1.top - HANDLE_OFFECT_MOVE < y
    ) { //触点开始点
      curHandle = 'handle1';
    } else if (
      handle2.left + HANDLE_SIZE + HANDLE_OFFECT_MOVE > x
      && handle2.left - HANDLE_OFFECT_MOVE < x
      && handle2.top + HANDLE_SIZE + HANDLE_OFFECT_MOVE > y
      && handle2.top - HANDLE_OFFECT_MOVE < y
    ) { //触点结束点
      curHandle = 'handle2';
    }
    // 记录准备移动的触点
    this.setData({ curHandle });
  },

  bindtouchmove(e) { //触点移动事件
    if (this.data.lock) return; //防止计算过于频繁
    this.data.lock = true;
    setTimeout(() => this.setData({ lock: false }), 50)
    this.compute(e);
  },

  bindtouchend(e) {
    this.compute(e);
    this.setData({ lock: false })
  },

  compute(e) { //根据唯一计算触点数值
    const initTouch = this.data.circleWrapper;
    const id = this.data.curHandle;
    if (!id) return;
    const position = this.data.position;
    const changedTouches = e.changedTouches[0];
    // 触点移动轨迹圆的半径
    const radius = this.data.circleWrapper.width / 2 - CIRCLE_BORDER_WIDTH / 2;  //半径=圆的宽度/2 - 圆的边框长/2
    const mPos = {
      x: changedTouches.x - CANVAS_DIFF_SIZE / 2,
      y: changedTouches.y - CANVAS_DIFF_SIZE / 2
    };
    const atan = Math.atan2(mPos.x - radius, mPos.y - radius);
    const deg = -atan / (Math.PI / 180) + 180;
    const minValue = this.data.size.min || 0;
    const maxValue = this.data.size.max || 360;
    const steps = maxValue - minValue;
    const stepSize = 360 / steps;
    const value = Object.assign({}, this.data.value);
    value[id] = Math.round(deg / stepSize);

    if(value.handle1 >= value.handle2 ) { //在这里添加条件
      //return 
    }

    this.setData({ value });
    this.updateWidget();
  }

})
