// XXX another full pass on this all.
$.fx.speeds._default = 2000;

var apply = function (el, events) {
  // xcxc assume that this is a jquery array
  events = events || ['insert', 'remove', 'move'];

  var animateIn = function (n, parent, next, onComplete) {
    parent.insertBefore(n, next);
    var $n = $(n);
    var height = $n.height();
    var paddingTop = parseInt($n.css("paddingTop"), 10);
    var paddingBottom = parseInt($n.css("paddingBottom"), 10);
    var marginTop = parseInt($n.css("marginTop"), 10);
    var marginBottom = parseInt($n.css("marginBottom"), 10);
    var borderTop = parseInt($n.css("borderTop"), 10);
    var borderBottom = parseInt($n.css("borderBottom"), 10);

    $n.css({
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      marginTop: 0,
      marginBottom: 0,
      borderTopWidth: 0,
      borderBottomWidth: 0,
      overflow: "hidden"
    });

    $n.animate({
      height: height,
      paddingTop: paddingTop,
      paddingBottom: paddingBottom,
      marginTop: marginTop,
      marginBottom: marginBottom,
      borderTopWidth: borderTop,
      borderBottomWidth: borderBottom
    }, function () {
      onComplete && onComplete();
    });
  };

  var animateOut = function (n, onComplete) {
    var $n = $(n);
    $n.css({
      overflow: "hidden"
    });
    var marginTop = $n.css('marginTop');

    $n.animate({
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      marginTop: 0,
      marginBottom: 0,
      borderTopWidth: 0,
      borderBottomWidth: 0
    }, function () {
      n.parentNode.removeChild(n);
      onComplete && onComplete();
    });
  };

  var animateQueue = [];
  var animationActive = false;
  var moveActive = false;
  var dequeuePlanned = false;
  var runOrQueue = function(f) {
    if (animationActive) {
      animateQueue.push(f);
    } else {
      animationActive = true;
      f();
    }
  };
  var runOrQueueIfMoving = function(f) {
    if (moveActive) {
      animateQueue.push(f);
    } else {
      animationActive = true;
      f();
    }
  };
  var dequeue = function () {
    animationActive = false;
    moveActive = false;
    dequeuePlanned = false;
    if (animateQueue.length > 0) {
      animationActive = true;
      animateQueue.shift()();
    }
  };

  // xcxc chained hooks?
  $(el)[0].$uihooks = {};

  if (_.contains(events, 'insert')) {
    $(el)[0].$uihooks.insertElement = function (n, parent, next) {
      runOrQueueIfMoving(function () {
        var onComplete = dequeuePlanned ? null : dequeue;
        dequeuePlanned = true;
        animateIn(n, parent, next, onComplete);
      });
    };
  }

  if (_.contains(events, 'remove')) {
    $(el)[0].$uihooks.removeElement = function (n) {
      runOrQueueIfMoving(function () {
        var onComplete = dequeuePlanned ? null : dequeue;
        dequeuePlanned = true;
        animateOut(n, onComplete);
      });
    };
  }


  if (_.contains(events, 'move')) {
    $(el)[0].$uihooks.moveElement = function (n, parent, next) {
      runOrQueue(function () {
        moveActive = true;

        // - make an empty clone of `n` that will animate out of existence
        //
        // - make an empty clone of `n` that will animate into existence
        // - at the desired new position
        //
        // - give `n` absolute positioning, and move it to its desired
        // - new position
        var $n = $(n);
        var pos = $n.position();

        var newPositionPlaceholder = $n.clone();
        newPositionPlaceholder.css({visibility: 'hidden'});
        animateIn(newPositionPlaceholder[0], parent, next);

        var oldPositionPlaceholder = $n.clone();
        $n.css({
          position: 'absolute',
          top: pos.top,
          left: pos.left
        });

        var clonePos = newPositionPlaceholder.position();

        oldPositionPlaceholder.css({visibility: 'hidden'});
        parent.insertBefore(oldPositionPlaceholder[0], $n.next()[0]);
        animateOut(oldPositionPlaceholder[0]);

        $n.animate({
          top: clonePos.top,
          left: clonePos.left
        }, function () {
          newPositionPlaceholder.remove();
          $n.removeAttr('style');
          parent.insertBefore(n, next);
          dequeue();
        });
      });
    };
  }
};

AnimatedList = Package.ui.Component.extend({
  typeName: 'AnimatedList',
  render: function (buf) {
    buf.write(this.content);
  },
  attached: function () {
    var childEls = this.$('*');
    if (childEls.length !== 1)
      throw new Error("#AnimatedList must have precisely one top-level child element");
    apply(childEls);
  }
});
