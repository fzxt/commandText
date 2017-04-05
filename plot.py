import matplotlib.pyplot as plt
from dateutil import parser
import sys



if len(sys.argv) == 6:
	#x_axis = [ int(x) for x in sys.argv[1].split(",") ]
	datelist = sys.argv[1].split(",")
	x_axis = [parser.parse(x) for x in datelist]
	y_axis = [ int(y) for y in sys.argv[2].split(",") ]
	fig, ax = plt.subplots(1)
	plt.plot(x_axis, y_axis)
	fig.autofmt_xdate()
	plt.xlabel(sys.argv[3])
	plt.ylabel(sys.argv[4])
	plt.title(sys.argv[5])
	plt.grid(True)
	plt.savefig("graph.png")