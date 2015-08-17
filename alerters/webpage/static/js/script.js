(function() {
  this.init = function(api, interval) {
    //--------------------------------------------------
    // Register menu button events
    //--------------------------------------------------
    var updateToggle = true,
      followToggle = true,
      fullscreenToggle = false;

    $('.update-toggle').click(function() {
      if (updateToggle) {
        updateToggle = false;
        $('.update-toggle .turn-off').hide();
        $('.update-toggle .turn-on').show();
      } else {
        updateToggle = true;
        $('.update-toggle .turn-on').hide();
        $('.update-toggle .turn-off').show();
      }
    });

    $('.follow-toggle').click(function() {
      if (followToggle) {
        followToggle = false;
        $('.follow-toggle .turn-off').hide();
        $('.follow-toggle .turn-on').show();
      } else {
        followToggle = true;
        $('.follow-toggle .turn-on').hide();
        $('.follow-toggle .turn-off').show();
      }
    });

    $('.fullscreen-toggle').click(function() {
      if (!fullscreenToggle) {
        var main = $('.main')[0];
        (main.requestFullScreen ||
         main.webkitRequestFullScreen ||
         main.mozRequestFullScreen).call(main);
        fullscreenToggle = true;
        $('.fullscreen-toggle .turn-off').hide();
        $('.fullscreen-toggle .turn-on').show();
      } else {
        (document.exitFullscreen ||
         document.webkitExitFullscreen ||
         document.mozCancelFullScreen).call(document);
        fullscreenToggle = false;
        $('.fullscreen-toggle .turn-on').hide();
        $('.fullscreen-toggle .turn-off').show();
      }
    });

    $('.back-to-top').click(function() {
      if (fullscreenToggle) {
        // main is scroll able in fullscreen mode
        $('.main').scrollTop(0);
      } else {
        window.scrollTo(0, 0);
      }
    });

    //--------------------------------------------------
    // Pull data from server end
    //--------------------------------------------------
    var maxCount = 80,
        curCount = 0,
        placeholder = $('.items tr.placeholder'),
        updateAt = 0;

    pull();
    setInterval(pull, interval * 1e3);

    /**
     * Pull data
     */
    function pull() {
      if (updateToggle) {
        var uri = sprintf("{0}?time={1}", api, updateAt);
        $.get(uri, function(list) {
          list.forEach(function(data) {
            addItem(data);
            updateAt = +data.stamp;
          });
        });
      }
    }

    /**
     * Add new item to table
     */
    function addItem(data) {
      $('.wait-data').hide();

      while (curCount > maxCount) {
        $('.items tbody tr').first().remove();
        curCount -= 1;
      }

      var className;
      var child = placeholder.clone();
      child.appendTo($('.items tbody'));

      switch(data.level) {
        case 0:
          className = 'info';
          break;
        case 1:
          className = 'warnning';
          break;
        case 2:
          className = "danger";
          break;
      }

      child.attr('class', className);
      child.find('pre code').text(data.lines.map(function(l) {
        return l.trim();
      }).join('\n'));
      child.find('.datetime').text(strftime(data.stamp));
      child.find('.message .name').text(data.name);
      child.find('.message .errors-count').text(data.count);

      hljs.highlightBlock(child.find('pre code')[0]);

      curCount += 1;

      if (followToggle) {
        if (fullscreenToggle) {
          // main is scroll able in fullscreen mode
          $('.main').scrollTop($('.main')[0].scrollHeight);
        } else {
          window.scrollTo(0, document.body.scrollHeight);
        }
      }

      if ($('.main').height() > 1300) {
        $('.back-to-top-box').show();
      }
    }

  }
})(this);


// help to sprintf a string
function sprintf() {
  var fmt = [].slice.apply(arguments, [0, 1])[0];
  var args = [].slice.apply(arguments, [1]);
  return fmt.replace(/{(\d+)}/g, function(match, idx) {
    return typeof args[idx] != 'undefined'? args[idx] : match;
  });
}

/**
 * convert unix timestamp to readable string format
 *
 * @param {Number} secs
 * @return {String}
 */
function strftime(stamp) {
  var date = new Date(stamp);
  // getMonth() return 0~11 numbers
  var month = date.getMonth() + 1;
  var day = date.getDate();
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var seconds = date.getSeconds();
  var millsecs = date.getMilliseconds();

  // normalize
  month = ('00' + month).slice(-2);
  day = ('00' + day).slice(-2);
  hours = ('00' + hours).slice(-2);
  minutes = ('00' + minutes).slice(-2);
  seconds = ('00' + seconds).slice(-2);
  millsecs = ('000' + millsecs).slice(-3);
  return sprintf('{0}/{1} {2}:{3}:{4},{5}',
                month, day, hours, minutes, seconds, millsecs);
}
