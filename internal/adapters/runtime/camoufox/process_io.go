package camoufox

import (
	"bufio"
	"io"
)

func scanEndpoint(log io.Writer, stdout io.Reader, endpointCh chan<- string) {
	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	sent := false
	for scanner.Scan() {
		line := scanner.Text()
		_, _ = io.WriteString(log, line+"\n")
		if sent {
			continue
		}
		if endpoint := endpointPattern.FindString(line); endpoint != "" {
			endpointCh <- endpoint
			sent = true
		}
	}
}

func scanWorkerLines(stdout io.Reader, lines chan<- string) {
	defer close(lines)
	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 0, 64*1024), 16*1024*1024)
	for scanner.Scan() {
		lines <- scanner.Text()
	}
}

func copyTail(dst io.Writer, src io.Reader) {
	_, _ = io.Copy(dst, src)
}
