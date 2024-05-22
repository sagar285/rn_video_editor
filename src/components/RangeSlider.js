import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  View,
  ScrollView,
} from 'react-native';
import {PanGestureHandler} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const {height, width} = Dimensions.get('screen');

const RangeSlider = forwardRef((props, ref) => {
  const {
    onValueChange1,
    onValueChange2,
    allVideos = [],
    maxDuration = 0,
    videoPlayerRef,
  } = props;

  const thumbWidth = 2;
  const centerGap = width / 2; // Gap on left and right sides
  const baseSliderWidth = width / 1.2;

  const scrollViewRef = useRef(null);
  const [currentScrollPosition, setCurrentScrollPosition] = useState(0);

  const createSliderState = ({min, max, sliderWidth, uri}) => ({
    position: useSharedValue(0),
    position2: useSharedValue(sliderWidth),
    min,
    max,
    sliderWidth,
    selectedMin: min,
    selectedMax: max,
    uri,
  });

  var totalWidth = 0;

  const [sliders, setSliders] = useState(
    allVideos.map(slider => {
      const sliderWidth = (slider.max / maxDuration) * baseSliderWidth;
      totalWidth = totalWidth + sliderWidth;
      return createSliderState({
        min: slider.min,
        max: slider.max,
        sliderWidth: sliderWidth,
        uri: slider.uri,
      });
    }),
  );

  console.log('totalWidth', totalWidth);

  const onValueChange = useCallback(
    (index, isSecond) => {
      const slider = sliders[index];
      const newMin =
        slider.min +
        Math.floor(
          slider.position.value /
            (slider.sliderWidth / (slider.max - slider.min)),
        );
      const newMax =
        slider.min +
        Math.floor(
          slider.position2.value /
            (slider.sliderWidth / (slider.max - slider.min)),
        );
      setSliders(prev =>
        prev.map((s, i) =>
          i === index ? {...s, selectedMin: newMin, selectedMax: newMax} : s,
        ),
      );
      if (isSecond) {
        runOnJS(onValueChange2)({min: newMin, max: newMax});
      } else {
        runOnJS(onValueChange1)({min: newMin, max: newMax});
      }
    },
    [onValueChange1, onValueChange2, sliders],
  );

  const createGestureHandler = useCallback(
    (index, isSecond) =>
      useAnimatedGestureHandler({
        onStart: (_, ctx) => {
          ctx.startX = isSecond
            ? sliders[index].position2.value
            : sliders[index].position.value;
        },
        onActive: (e, ctx) => {
          const slider = sliders[index];
          const minGap =
            5 * (slider.sliderWidth / (slider.max - slider.min)) + thumbWidth; // Calculate the minimum gap in pixels including thumb width
          if (isSecond) {
            const newX = ctx.startX + e.translationX;
            if (newX > slider.sliderWidth) {
              slider.position2.value = slider.sliderWidth;
            } else if (newX < slider.position.value + minGap) {
              slider.position2.value = slider.position.value + minGap;
            } else {
              slider.position2.value = newX;
            }
          } else {
            const newX = ctx.startX + e.translationX;
            if (newX < 0) {
              slider.position.value = 0;
            } else if (newX > slider.position2.value - minGap) {
              slider.position.value = slider.position2.value - minGap;
            } else {
              slider.position.value = newX;
            }
          }
        },
      }),
    [sliders, onValueChange],
  );

  const createAnimatedStyle = useCallback(
    (index, isSecond) =>
      useAnimatedStyle(() => ({
        transform: [
          {
            translateX: isSecond
              ? sliders[index].position2.value
              : sliders[index].position.value,
          },
        ],
      })),
    [sliders],
  );

  const createSliderStyle = useCallback(
    index =>
      useAnimatedStyle(() => ({
        transform: [{translateX: sliders[index].position.value}],
        width: sliders[index].position2.value - sliders[index].position.value,
      })),
    [sliders],
  );

  const selectedValues = useMemo(
    () =>
      sliders.map(slider => ({
        min: slider.selectedMin,
        max: slider.selectedMax,
      })),
    [sliders],
  );

  console.log('sliders', sliders);

  const onRun = ({currentTime, startTime, endTime}) => {
    const relativeTime = currentTime - startTime;
    const scrollPosition = (relativeTime / endTime) * baseSliderWidth;

    // sliderPinPosition.value = withTiming(
    //   (relativeTime / rangeDuration) * 327,
    //   {
    //     duration: 500,
    //     easing: Easing.linear,
    //   },
    // );

    // Scroll the ScrollView horizontally
    scrollViewRef.current?.scrollTo({
      x: currentScrollPosition + scrollPosition,
      animated: true,
    });
  };

  useImperativeHandle(ref, () => ({
    onRun,
  }));

  const handleScrollBeginDrag = useCallback(() => {
    videoPlayerRef.current.pause();
  }, []);

  const handleScrollEndDrag = useCallback(({nativeEvent}) => {
    let current = nativeEvent.contentOffset.x;

    const newMin = 0 + Math.floor(current / (327.5 / (maxDuration - 0)));
    console.log('newMin', newMin);

    videoPlayerRef.current.seek(newMin);

    // alert(`drag ${current}`);

    setCurrentScrollPosition(current);
  }, []);

  const handleOnScroll = ({nativeEvent}) => {
    let current = nativeEvent.contentOffset.x;

    const newMin = 0 + Math.floor(current / (327.5 / (maxDuration - 0)));
    console.log('newMin', newMin);

    // videoPlayerRef.current.seek(newMin);

    // alert(`drag ${current}`);

    // setCurrentScrollPosition(current);
  };

  const handleOnMomentumScrollEnd = useCallback(({nativeEvent}) => {
    // let current = nativeEvent.contentOffset.x;
    // alert(`end ${current}`);
    // setCurrentScrollPosition(current);
  }, []);

  return (
    <>
      <View style={styles.horizontalLine} />
      <ScrollView
        horizontal
        ref={scrollViewRef}
        onScrollBeginDrag={handleScrollBeginDrag}
        // onScrollEndDrag={handleScrollEndDrag}
        // onMomentumScrollEnd={handleOnMomentumScrollEnd}
        onScroll={handleOnScroll}
        contentContainerStyle={{
          paddingHorizontal: centerGap,
          height: height / 3,
          alignItems: 'flex-start',
        }}
        bounces={false}
        scrollEventThrottle={1} // Update scroll events more frequently
        alwaysBounceHorizontal={true}
        showsHorizontalScrollIndicator={false}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          {sliders.map((slider, index) => {
            const gestureHandler = createGestureHandler(index, false);
            const gestureHandler2 = createGestureHandler(index, true);
            const animatedStyle = createAnimatedStyle(index, false);
            const animatedStyle2 = createAnimatedStyle(index, true);
            const sliderStyle = createSliderStyle(index);

            return (
              <View
                key={String(index)}
                style={[styles.sliderContainer, {width: slider.sliderWidth}]}>
                {/* background view */}
                <Animated.View
                  style={[
                    {
                      ...styles.sliderFront,
                      backgroundColor: '#DFEAFB',
                      width: slider.sliderWidth,
                    },
                  ]}
                />
                {/* front view */}
                <Animated.View style={[sliderStyle, styles.sliderFront]} />
                <PanGestureHandler onGestureEvent={gestureHandler}>
                  <Animated.View
                    style={[
                      animatedStyle,
                      {...styles.thumb, width: thumbWidth},
                    ]}
                  />
                </PanGestureHandler>
                <PanGestureHandler onGestureEvent={gestureHandler2}>
                  <Animated.View
                    style={[
                      animatedStyle2,
                      {...styles.thumb, width: thumbWidth},
                    ]}
                  />
                </PanGestureHandler>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <Animated.View style={[styles.sliderPin, {marginLeft: centerGap}]} />
    </>
  );
});

export default React.memo(RangeSlider);

const styles = StyleSheet.create({
  container: {},
  sliderContainer: {
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 45,
    marginTop: 50,
    // marginRight: 16,
  },
  horizontalLine: {
    height: 1.5,
    backgroundColor: 'grey',
    width: width,
  },
  sliderBack: {
    height: 60,
    backgroundColor: '#DFEAFB',
  },
  sliderFront: {
    height: 60,
    backgroundColor: '#3F4CF6',
    position: 'absolute',
    overflow: 'hidden',
  },
  sliderPin: {
    height: '100%',
    backgroundColor: 'red',
    position: 'absolute',
    width: 2,
    overflow: 'hidden',
  },
  thumb: {
    // left: -10,
    width: 1,
    height: 60,
    position: 'absolute',
    backgroundColor: 'yellow',
  },
});