(function() {
  this.init = function(api, interval) {
    var updateToggle = true; // on
    var followToggle = true; // on
    var fullscreenToggle = false; // off

    // register nav buttons
    //
    $('a.update-toggle').click(function() {
      if (updateToggle) {
        updateToggle = false;  // switch to off
        $('a.update-toggle').text('Enable Update')
      } else {
        updateToggle = true;  // switch to on
        $('a.update-toggle').text('Disable Update')
      }
    });

    $('a.follow-toggle').click(function() {
      if (followToggle) {
        followToggle = false;  // switch to off
        $('a.follow-toggle').text('Enable Follow')
      } else {
        followToggle = true;  // switch to on
        $('a.follow-toggle').text('Disable Follow')
      }
    });

    $('a.fullscreen-toggle').click(function() {
      if (!fullscreenToggle) {
        var body = $('body')[0];
        (body.requestFullScreen ||
         body.webkitRequestFullScreen ||
         body.mozRequestFullScreen).call(body);
        $('a.fullscreen-toggle').text('Exit Fullscreen')
        fullscreenToggle = true;
      } else {
        (document.exitFullscreen ||
         document.webkitExitFullscreen ||
         document.mozCancelFullScreen).call(document);
        $('a.fullscreen-toggle').text('Enter Fullscreen')
        fullscreenToggle = false;
      }
    });

    var maxCount = 100;
    var curCount = 0;
    var placeholder = $('ul.main li.placeholder');
    var updateAt = 1;

    pull(); setInterval(pull,
                        Math.min(10, interval / 2) * 1e3);

    // pull news from api
    function pull() {
      if (!updateToggle)
        return;
      $.get(api, function(list) {
        list.forEach(function(data) {
          if (updateAt < data.updateAt) {
            addItem(data);
            updateAt = data.updateAt;
          }
        });
      });
    }

    // add new item to dom
    function addItem(data) {
      $('p.loader').hide();

      while (curCount > maxCount) {
        $('ul.main li.item').first().remove();
        curCount -= 1;
      }

      var color;
      var child = placeholder.clone();
      child.appendTo($('ul.main'));

      switch(data.level) {
        case 0:
          color = 'gray';
          break;
        case 1:
          color = 'yellow';
          break;
        case 2:
          color = 'red';
          break;
      }
      child.attr('class', 'item ' + color);
      child.find('span p.datetime').text(
        (new Date(data.updateAt)).toString().slice(0, 24));
      child.find('span p.message').text(
        sprintf('{0} => {1} errors in {2} secs',
                data.name, data.count, data.interval));
      child.find('pre code').text(data.lines.map(function(l) {
        return l.trim();
      }).join('\n'));
      hljs.highlightBlock(child.find('pre code')[0]);
      curCount += 1;

      if (followToggle)
        $('body').scrollTop($('body')[0].scrollHeight);
    }
  };
})(this);

// help to sprintf a string
function sprintf() {
  var fmt = [].slice.apply(arguments, [0, 1])[0];
  var args = [].slice.apply(arguments, [1]);
  return fmt.replace(/{(\d+)}/g, function(match, idx) {
    return typeof args[idx] != 'undefined'? args[idx] : match;
  });
}
