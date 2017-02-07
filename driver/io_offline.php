<?php
/**
 * -----------------------------------------------------------------------------
 * @package     smartVISU
 * @author      Martin Gleiß
 * @copyright   2012 - 2015
 * @license     GPL [http://www.gnu.de]
 * -----------------------------------------------------------------------------
 */


// get config-variables 
require_once '../lib/includes.php';


/**
 * This class is an offline driver as a replacement for knx-bus
 */
class driver_offline
{
	var $item = '';
	var $val = '';

	var $filename = '';
	var $fp = null;

	// if this is set to true, all values will be written.
	var $writeall = false;

	/**
	 * constructor
	 */
	public function __construct($request)
	{
		$this->item = explode(",", $request['item']);
		$this->val = $request['val'];
		$this->filename = const_path.'temp/offline_'.config_pages.'.var';
	}

	/**
	 * Read all items from the file
	 */
	private function fileread()
	{
		$ret = array();

		if (!is_file($this->filename))
			touch($this->filename);

		$this->fp = fopen($this->filename, 'r+');

		if ($this->fp)
		{
			while (($line = fgets($this->fp, 10240)) !== false)
			{
				list($item, $val) = explode('=', $line, 2);
				$val = trim($val);
				$ret[trim($item)] = $val;
			}
		}

		return $ret;
	}

	/**
	 * Store all items in the file
	 */
	private function filewrite($data)
	{
		if ($this->fp)
		{
			fseek($this->fp, 0, SEEK_SET);

			foreach ($data as $item => $val)
			{
				if ($item != '')
					fwrite($this->fp, $item);
					fwrite($this->fp, ' = ');
					fwrite($this->fp, $val);
					fwrite($this->fp, "\r\n");
			}

			fclose($this->fp);
		}
	}

	/**
	 * get a json formatted response
	 */
	public function json()
	{
		$ret = array();

		$data = $this->fileread();

		// write if a value is given
		if ($this->val != '' or $this->writeall)
		{
			foreach ($this->item as $item)
			{
				$data[$item] = $this->val;
			}

			$this->filewrite($data);
		}

		foreach ($this->item as $item)
		{
			$ret[$item] = $data[$item];
		}

		return json_encode($ret);
	}
}


// -----------------------------------------------------------------------------
// call the driver
// -----------------------------------------------------------------------------

$driver = new driver_offline(array_merge($_GET, $_POST));
header('Content-Type: application/json');
echo $driver->json();

?>
